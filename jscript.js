function safeStorageGet(key, storageName = 'localStorage') {
    try {
        return window[storageName].getItem(key);
    } catch (error) {
        return null;
    }
}

function safeStorageSet(key, value, storageName = 'localStorage') {
    try {
        window[storageName].setItem(key, value);
    } catch (error) {
        // Storage can be unavailable on some mobile/private browsers.
    }
}

function windowNameHasFlag(flag) {
    return typeof window.name === 'string' && window.name.split('|').includes(flag);
}

function windowNameSetFlag(flag) {
    if (windowNameHasFlag(flag)) return;
    window.name = window.name ? `${window.name}|${flag}` : flag;
}

function mediaMatches(query) {
    return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

document.addEventListener('DOMContentLoaded', function() {
    const developerSections = document.querySelectorAll('.developer-section');
    developerSections.forEach(section => {
        const toggle = section.querySelector('.dev-name');
        const bio = section.querySelector('.dev-bio');

        if (!toggle || !bio) return;

        toggle.classList.add('dev-toggle');
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('tabindex', '0');
        toggle.setAttribute('aria-expanded', 'false');
        bio.hidden = true;
        section.classList.remove('is-open');

        let lastPointerActivation = 0;

        const scrollDeveloperBioIntoView = () => {
            const needsScrollHelp = mediaMatches('(max-width: 760px), (hover: none), (pointer: coarse)');

            if (!needsScrollHelp) return;

            window.requestAnimationFrame(() => {
                bio.scrollIntoView({
                    behavior: mediaMatches('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            });
        };

        const toggleDeveloperBio = () => {
            const isOpening = bio.hidden;
            bio.hidden = !isOpening;
            toggle.setAttribute('aria-expanded', isOpening ? 'true' : 'false');
            section.classList.toggle('is-open', isOpening);

            if (isOpening) {
                scrollDeveloperBioIntoView();
            }
        };

        const activateDeveloperBio = event => {
            if (event) {
                event.preventDefault();
            }

            toggleDeveloperBio();
        };

        toggle.addEventListener('pointerup', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;

            lastPointerActivation = Date.now();
            activateDeveloperBio(event);
        });

        toggle.addEventListener('click', event => {
            if (Date.now() - lastPointerActivation < 500) {
                event.preventDefault();
                return;
            }

            activateDeveloperBio(event);
        });
        toggle.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                activateDeveloperBio(event);
            }
        });
    });

    // Branded in-page meeting room. Jitsi supplies the call connection inside this site.
    const siteNav = document.querySelector('header nav');
    const meetingQueryKey = 'room';
    let meetingApi = null;
    let meetingScriptPromise = null;
    let meetingFocusBeforeOpen = null;
    let meetingSessionId = 0;

    const normalizeMeetingCode = value => String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    const createMeetingCode = () => {
        if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
            return '';
        }

        const words = ['mewar', 'chetak', 'pratap', 'aravalli'];
        const randomWord = words[Math.floor(Math.random() * words.length)];
        const randomSuffix = Array.from(window.crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('');
        return `${randomWord}-${randomSuffix}`;
    };

    const buildMeetingInviteUrl = code => {
        const inviteUrl = new URL('index.html', window.location.href);
        inviteUrl.searchParams.delete(meetingQueryKey);
        inviteUrl.hash = new URLSearchParams({ [meetingQueryKey]: code }).toString();
        return inviteUrl.toString();
    };

    const updateMeetingAddress = code => {
        const currentPageUrl = new URL(window.location.href);
        currentPageUrl.searchParams.delete(meetingQueryKey);
        currentPageUrl.hash = code
            ? new URLSearchParams({ [meetingQueryKey]: code }).toString()
            : '';
        window.history.replaceState({}, '', currentPageUrl);
    };

    const copyText = async value => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return;
        }

        const copyInput = document.createElement('textarea');
        copyInput.value = value;
        copyInput.setAttribute('readonly', '');
        copyInput.style.position = 'fixed';
        copyInput.style.opacity = '0';
        document.body.appendChild(copyInput);
        copyInput.select();
        document.execCommand('copy');
        copyInput.remove();
    };

    const liveMeetingToggle = document.createElement('button');
    liveMeetingToggle.type = 'button';
    liveMeetingToggle.className = 'live-meeting-toggle';
    liveMeetingToggle.setAttribute('aria-controls', 'live-meeting-modal');
    liveMeetingToggle.setAttribute('aria-expanded', 'false');
    liveMeetingToggle.setAttribute('aria-haspopup', 'dialog');
    liveMeetingToggle.setAttribute('aria-label', 'Open Live Room');
    liveMeetingToggle.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"></path>
            <path d="M16 10.25l5-2.75v9l-5-2.75z"></path>
        </svg>
        <span class="live-meeting-toggle-label">Live Room</span>
    `;

    if (siteNav) {
        const headerActions = document.createElement('div');
        const languageSelector = siteNav.querySelector('.language-selector');
        headerActions.className = 'header-actions';

        if (languageSelector) {
            headerActions.appendChild(languageSelector);
        }

        headerActions.appendChild(liveMeetingToggle);
        siteNav.appendChild(headerActions);
    }

    const liveMeetingModal = document.createElement('div');
    liveMeetingModal.className = 'live-meeting-modal';
    liveMeetingModal.id = 'live-meeting-modal';
    liveMeetingModal.hidden = true;
    liveMeetingModal.innerHTML = `
        <div class="live-meeting-backdrop" data-meeting-close></div>
        <section class="live-meeting-room" role="dialog" aria-modal="true" aria-labelledby="live-meeting-title" tabindex="-1">
            <div class="live-meeting-room-header">
                <div class="live-meeting-brand">
                    <span class="live-meeting-brand-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M4 7.5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z"></path>
                            <path d="M16 10.25l5-2.75v9l-5-2.75z"></path>
                        </svg>
                    </span>
                    <div>
                        <span class="live-meeting-kicker">Video meeting</span>
                        <h2 id="live-meeting-title">Live Room</h2>
                    </div>
                </div>
                <button class="live-meeting-close" type="button" data-meeting-close aria-label="Close live meeting room">&times;</button>
            </div>
            <div class="live-meeting-setup">
                <p class="live-meeting-description">Start your own meeting room here and invite people with a link to this website.</p>
                <form class="live-meeting-form">
                    <label for="meeting-name">Your name</label>
                    <input id="meeting-name" name="meeting-name" type="text" maxlength="40" placeholder="Enter your name" autocomplete="name">
                    <label for="meeting-code">Room code</label>
                    <div class="live-meeting-code-row">
                        <input id="meeting-code" name="meeting-code" type="text" maxlength="48" placeholder="Create a room or enter a code" autocomplete="off" autocapitalize="none" spellcheck="false">
                        <button class="live-meeting-new-code" type="button">Private Code</button>
                    </div>
                    <button class="live-meeting-join" type="submit">Start or Join Meeting</button>
                </form>
                <p class="live-meeting-note">Use Private Code for a hard-to-guess invitation and share it only with guests. When you join, your display name, camera, and microphone are handled by the embedded meeting service.</p>
            </div>
            <div class="live-meeting-stage" hidden>
                <div class="live-meeting-stage-toolbar">
                    <p>Room: <strong class="live-meeting-room-code"></strong></p>
                    <div class="live-meeting-stage-actions">
                        <button class="live-meeting-share" type="button">Copy Invite Link</button>
                        <button class="live-meeting-leave" type="button">Leave</button>
                    </div>
                </div>
                <div class="live-meeting-frame" aria-label="Rana Live Room video meeting"></div>
                <p class="live-meeting-status" aria-live="polite">Preparing your meeting room...</p>
            </div>
        </section>
    `;
    document.body.appendChild(liveMeetingModal);

    const liveMeetingRoom = liveMeetingModal.querySelector('.live-meeting-room');
    const liveMeetingSetup = liveMeetingModal.querySelector('.live-meeting-setup');
    const liveMeetingStage = liveMeetingModal.querySelector('.live-meeting-stage');
    const liveMeetingFrame = liveMeetingModal.querySelector('.live-meeting-frame');
    const liveMeetingStatus = liveMeetingModal.querySelector('.live-meeting-status');
    const liveMeetingForm = liveMeetingModal.querySelector('.live-meeting-form');
    const liveMeetingName = liveMeetingModal.querySelector('#meeting-name');
    const liveMeetingCode = liveMeetingModal.querySelector('#meeting-code');
    const liveMeetingRoomCode = liveMeetingModal.querySelector('.live-meeting-room-code');
    const liveMeetingJoin = liveMeetingModal.querySelector('.live-meeting-join');
    let currentMeetingCode = '';

    const setMeetingStatus = message => {
        liveMeetingStatus.textContent = message;
    };

    const showMeetingSetupError = message => {
        const setupMessage = liveMeetingSetup.querySelector('.live-meeting-error') || document.createElement('p');
        setupMessage.className = 'live-meeting-error';
        setupMessage.textContent = message;
        liveMeetingSetup.appendChild(setupMessage);
    };

    const disposeMeeting = () => {
        meetingSessionId += 1;

        if (meetingApi) {
            const meetingToDispose = meetingApi;
            meetingApi = null;
            meetingToDispose.dispose();
        }

        liveMeetingFrame.innerHTML = '';
        liveMeetingRoom.classList.remove('is-in-call');
        liveMeetingSetup.hidden = false;
        liveMeetingStage.hidden = true;
        liveMeetingJoin.disabled = false;
        liveMeetingJoin.textContent = 'Start or Join Meeting';
    };

    const openLiveMeeting = roomCode => {
        meetingFocusBeforeOpen = document.activeElement;
        liveMeetingModal.hidden = false;
        document.body.classList.add('meeting-open');
        liveMeetingToggle.setAttribute('aria-expanded', 'true');

        if (roomCode) {
            liveMeetingCode.value = normalizeMeetingCode(roomCode);
        }

        liveMeetingRoom.focus();
        liveMeetingName.focus();
    };

    const closeLiveMeeting = () => {
        disposeMeeting();
        updateMeetingAddress('');
        liveMeetingModal.hidden = true;
        document.body.classList.remove('meeting-open');
        liveMeetingToggle.setAttribute('aria-expanded', 'false');

        if (meetingFocusBeforeOpen && typeof meetingFocusBeforeOpen.focus === 'function') {
            meetingFocusBeforeOpen.focus();
        }
    };

    const loadMeetingScript = () => {
        if (window.JitsiMeetExternalAPI) {
            return Promise.resolve();
        }

        if (meetingScriptPromise) {
            return meetingScriptPromise;
        }

        meetingScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            script.referrerPolicy = 'no-referrer';
            script.onload = resolve;
            script.onerror = () => {
                meetingScriptPromise = null;
                reject(new Error('Meeting service could not be loaded.'));
            };
            document.head.appendChild(script);
        });

        return meetingScriptPromise;
    };

    const startMeeting = async (requestedCode, displayName) => {
        const thisMeetingSession = ++meetingSessionId;
        currentMeetingCode = normalizeMeetingCode(requestedCode) || createMeetingCode();

        if (!currentMeetingCode) {
            showMeetingSetupError('A secure private room code could not be generated in this browser. Open this website over HTTPS and try again.');
            return;
        }

        liveMeetingCode.value = currentMeetingCode;
        liveMeetingRoomCode.textContent = currentMeetingCode;
        liveMeetingSetup.hidden = true;
        liveMeetingStage.hidden = false;
        liveMeetingRoom.classList.add('is-in-call');
        setMeetingStatus('Loading your live room...');
        liveMeetingJoin.disabled = true;
        liveMeetingJoin.textContent = 'Opening Room...';

        updateMeetingAddress(currentMeetingCode);

        try {
            await loadMeetingScript();

            if (thisMeetingSession !== meetingSessionId || liveMeetingModal.hidden) {
                return;
            }

            meetingApi = new window.JitsiMeetExternalAPI('meet.jit.si', {
                roomName: `RanaLiveRoom-${currentMeetingCode}`,
                width: '100%',
                height: '100%',
                parentNode: liveMeetingFrame,
                lang: 'en',
                userInfo: {
                    displayName: displayName || 'Guest'
                }
            });

            meetingApi.addListener('videoConferenceJoined', () => {
                setMeetingStatus('You are in the room. Copy the invite link to bring others here.');
            });

            meetingApi.addListener('readyToClose', () => {
                disposeMeeting();
                updateMeetingAddress('');
                setMeetingStatus('You left the meeting room.');
            });

            meetingApi.addListener('cameraError', () => {
                setMeetingStatus('Camera access is unavailable. Check browser permission or continue with audio.');
            });

            meetingApi.addListener('micError', () => {
                setMeetingStatus('Microphone access is unavailable. Check browser permission and try again.');
            });

            meetingApi.addListener('errorOccurred', event => {
                if (event && event.isFatal) {
                    setMeetingStatus('The meeting connection was interrupted. Leave and rejoin the room to try again.');
                }
            });

            setMeetingStatus('Your room is ready. Use the call controls inside the video area.');
        } catch (error) {
            if (thisMeetingSession !== meetingSessionId) {
                return;
            }

            disposeMeeting();
            liveMeetingStatus.textContent = '';
            showMeetingSetupError('The live room could not load. Check your internet connection and try again.');
        }
    };

    liveMeetingToggle.addEventListener('click', () => {
        openLiveMeeting(liveMeetingCode.value);
    });

    liveMeetingModal.querySelectorAll('[data-meeting-close]').forEach(closeControl => {
        closeControl.addEventListener('click', closeLiveMeeting);
    });

    liveMeetingModal.querySelector('.live-meeting-new-code').addEventListener('click', () => {
        const privateCode = createMeetingCode();

        if (!privateCode) {
            showMeetingSetupError('A secure private room code could not be generated in this browser. Open this website over HTTPS and try again.');
            return;
        }

        liveMeetingSetup.querySelector('.live-meeting-error')?.remove();
        liveMeetingCode.value = privateCode;
        liveMeetingCode.focus();
    });

    liveMeetingForm.addEventListener('submit', event => {
        event.preventDefault();
        liveMeetingSetup.querySelector('.live-meeting-error')?.remove();
        startMeeting(liveMeetingCode.value, liveMeetingName.value.trim());
    });

    liveMeetingModal.querySelector('.live-meeting-share').addEventListener('click', async () => {
        try {
            await copyText(buildMeetingInviteUrl(currentMeetingCode));
            setMeetingStatus('Invitation link copied. Share it with anyone you want in this room.');
        } catch (error) {
            setMeetingStatus('Copy was unavailable. Copy the room code and share it with your guest.');
        }
    });

    liveMeetingModal.querySelector('.live-meeting-leave').addEventListener('click', () => {
        if (meetingApi) {
            meetingApi.executeCommand('hangup');
        }

        disposeMeeting();
        updateMeetingAddress('');
        setMeetingStatus('You left the meeting room.');
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !liveMeetingModal.hidden) {
            closeLiveMeeting();
        }
    });

    const hashMeetingCode = new URLSearchParams(window.location.hash.replace(/^#/, '')).get(meetingQueryKey);
    const legacyQueryCode = new URLSearchParams(window.location.search).get(meetingQueryKey);
    const sharedMeetingCode = normalizeMeetingCode(hashMeetingCode || legacyQueryCode);
    if (sharedMeetingCode) {
        updateMeetingAddress(sharedMeetingCode);
        openLiveMeeting(sharedMeetingCode);
    }

    // Background music
    const audio = document.createElement('audio');
    const audioButton = document.createElement('button');
    const savedMuted = safeStorageGet('backgroundMusicMuted') === 'true';
    let unlockHandlersAdded = false;

    audio.src = 'rajput%20clan.mp3';
    audio.loop = true;
    audio.volume = 0.45;
    audio.muted = savedMuted;
    audio.preload = 'auto';

    audioButton.type = 'button';
    audioButton.className = 'site-audio-toggle';
    document.body.appendChild(audio);
    document.body.appendChild(audioButton);

    const iconPlay = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
    const iconSound = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M16 8.5a5 5 0 0 1 0 7"></path><path d="M18.5 6a8 8 0 0 1 0 12"></path></svg>';
    const iconMuted = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M17 9l4 4"></path><path d="M21 9l-4 4"></path></svg>';

    const updateAudioButton = () => {
        audioButton.classList.toggle('is-muted', audio.muted);
        audioButton.classList.toggle('is-waiting', audio.paused && !audio.muted);

        if (audio.paused && !audio.muted) {
            audioButton.innerHTML = iconPlay;
            audioButton.setAttribute('aria-label', 'Play background music');
            audioButton.title = 'Play music';
        } else if (audio.muted) {
            audioButton.innerHTML = iconMuted;
            audioButton.setAttribute('aria-label', 'Unmute background music');
            audioButton.title = 'Unmute music';
        } else {
            audioButton.innerHTML = iconSound;
            audioButton.setAttribute('aria-label', 'Mute background music');
            audioButton.title = 'Mute music';
        }
    };

    const startMusic = () => {
        audio.play()
            .then(updateAudioButton)
            .catch(() => {
                updateAudioButton();
                addUnlockHandlers();
            });
    };

    const unlockMusic = () => {
        document.removeEventListener('click', unlockMusic);
        document.removeEventListener('keydown', unlockMusic);
        document.removeEventListener('touchstart', unlockMusic);
        unlockHandlersAdded = false;
        startMusic();
    };

    const addUnlockHandlers = () => {
        if (unlockHandlersAdded) return;
        unlockHandlersAdded = true;
        document.addEventListener('click', unlockMusic, { once: true });
        document.addEventListener('keydown', unlockMusic, { once: true });
        document.addEventListener('touchstart', unlockMusic, { once: true, passive: true });
    };

    audioButton.addEventListener('click', () => {
        if (audio.paused) {
            audio.muted = false;
            safeStorageSet('backgroundMusicMuted', 'false');
            startMusic();
            return;
        }

        audio.muted = !audio.muted;
        safeStorageSet('backgroundMusicMuted', audio.muted ? 'true' : 'false');
        updateAudioButton();
    });

    updateAudioButton();
    startMusic();

    // Wikipedia search functionality
    const wikiSearchForm = document.getElementById('wiki-search-form');
    const wikiSearchInput = document.getElementById('wiki-search-input');
    const wikiResultsContainer = document.getElementById('wiki-results-container');

    const showWikipediaStatus = (className, message) => {
        if (!wikiResultsContainer) return;

        const status = document.createElement('div');
        status.className = className;
        status.textContent = message;
        wikiResultsContainer.replaceChildren(status);
        wikiResultsContainer.classList.remove('hidden');
    };
    
    if (wikiSearchForm && wikiSearchInput && wikiResultsContainer) {
        let searchTimeout;
        
        // Real-time search as user types
        wikiSearchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                showWikipediaStatus('wiki-loading', 'Searching Wikipedia...');
                
                searchTimeout = setTimeout(() => {
                    searchWikipedia(query);
                }, 300);
            } else {
                wikiResultsContainer.classList.add('hidden');
            }
        });
        
        // Form submission
        wikiSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const query = wikiSearchInput.value.trim();
            if (query.length > 0) {
                searchWikipedia(query);
            }
        });
        
        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            if (!wikiSearchForm.contains(e.target) && !wikiResultsContainer.contains(e.target)) {
                wikiResultsContainer.classList.add('hidden');
            }
        });
    }
    
    function searchWikipedia(query) {
        if (!wikiResultsContainer) return;
        
        fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Wikipedia search request failed.');
                }

                return response.json();
            })
            .then(data => {
                if (data.query && data.query.search && data.query.search.length > 0) {
                    const results = document.createDocumentFragment();

                    data.query.search.forEach(result => {
                        const item = document.createElement('a');
                        const title = document.createElement('div');
                        const excerpt = document.createElement('div');

                        item.className = 'wiki-result-item';
                        item.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title)}`;
                        item.target = '_blank';
                        item.rel = 'noopener noreferrer';
                        item.referrerPolicy = 'no-referrer';

                        title.className = 'wiki-result-title';
                        title.textContent = result.title;

                        excerpt.className = 'wiki-result-excerpt';
                        excerpt.textContent = `${String(result.snippet).replace(/<[^>]*>/g, '')}...`;

                        item.appendChild(title);
                        item.appendChild(excerpt);
                        results.appendChild(item);
                    });

                    wikiResultsContainer.replaceChildren(results);
                } else {
                    showWikipediaStatus('wiki-no-results', 'No results found.');
                }
            })
            .catch(() => {
                showWikipediaStatus('wiki-error', 'Error fetching results. Please try again.');
            });
    }

    const aiForm = document.getElementById('ai-question-form');
    const aiInput = document.getElementById('ai-question-input');
    const aiWindow = document.getElementById('ai-chat-window');
    const aiPrompts = document.querySelectorAll('.ai-prompt');
    const aiNewChatButton = document.getElementById('ai-new-chat-button');

    if (aiForm && aiInput && aiWindow) {
        const aiAnswers = [
            {
                keywords: ['who', 'about', 'biography', 'maharanapratap', 'pratap', 'introduction'],
                answer: 'Maharana Pratap Singh I was the 13th Rana of Mewar. He is remembered for defending Mewar independence, refusing Mughal submission, and leading a long resistance from the Aravalli hills.'
            },
            {
                keywords: ['birth', 'born', 'early', 'childhood', 'kumbhalgarh'],
                answer: 'Maharana Pratap was born on May 9, 1540, at Kumbhalgarh Fort. He was the eldest son of Maharana Udai Singh II and Rani Jaiwanta Bai (as commonly described). From a young age, he was trained in leadership and warfare.'
            },
            {
                keywords: ['udai singh', 'udai singh ii', 'father', 'parents'],
                answer: 'Udai Singh II was Maharana Pratap\'s father and ruler of Mewar before him. After Udai Singh II\'s death in 1572, Pratap was recognized by the nobles as the next Rana.'
            },
            {
                keywords: ['ajabde', 'ajabde bai', 'ajabde bai punwar', 'consort', 'wife'],
                answer: 'Ajabde Bai Punwar was Maharana Pratap\'s chief consort. She is remembered as an important part of his royal household and family legacy.'
            },
            {
                keywords: ['family', 'children', 'amar singh', 'successor', 'amarsingh', 'amar singh i'],
                answer: 'Pratap\'s successor was Amar Singh I. In the royal tradition, Pratap\'s family included multiple sons and daughters, and Amar Singh I became the key continuation of Mewar\'s leadership after him.'
            },
            {
                keywords: ['battle', 'haldighati', 'haldighati yuddh', 'war', 'akbar', 'mughal', 'man singh'],
                answer: 'The Battle of Haldighati was fought in 1576 between Maharana Pratap and Mughal forces led by Man Singh I. The Mughals held the battlefield, but Pratap survived by retreating to the hills, regrouped, and continued resisting Mughal control.'
            },
            {
                keywords: ['chetak', 'horse', 'wounded', 'rawat jhala','escape', 'loyalty', 'courage'],
                answer: 'Chetak is remembered as Maharana Pratap\'s loyal horse. In popular tradition, Chetak carried the wounded Pratap away from Haldighati, becoming a symbol of loyalty and courage. (Some retellings also highlight the sacrifice of Rawat Jhala during the escape.)'
            },
            {
                keywords: ['rawat jhala', 'jhala', 'rawat', 'sacrifice'],
                answer: 'Rawat Jhala is remembered in the Haldighati tradition for drawing danger away and helping Pratap escape after the battle. His role is often described as a courageous diversion during a critical moment.'
            },
            {
                keywords: ['akbar', 'refuse', 'submission', 'submit', 'offer', 'diplomacy'],
                answer: 'Maharana Pratap refused Akbar because he would not surrender Mewar independence. He chose to preserve his kingdom\'s honor and autonomy rather than accept Mughal suzerainty, even though that meant continuing a difficult resistance.'
            },
            {
                keywords: ['bhamashah', 'bhil', 'allies', 'support', 'resources', 'financing'],
                answer: 'Bhamashah and the Bhil allies provided vital support to Maharana Pratap during his resistance. Their knowledge of the terrain, supplies, and financial help kept his forces strong while the Mughal army controlled the plains.'
            },
            {
                keywords: ['aftermath', 'after', 'what happened after', 'continued resistance', 'recovery', 'reconquer'],
                answer: 'After Haldighati, Pratap continued guerrilla warfare from the hills and slowly recovered parts of Mewar. His persistence allowed him to regain many outposts and keep Mughal rule from fully taking root in the region.'
            },
            {
                keywords: ['mewar', 'kingdom', 'rule', 'rana', 'chittorgarh'],
                answer: 'Mewar was Maharana Pratap\'s kingdom in present-day Rajasthan. He became its ruler in 1572 and defended independence through mountain warfare and alliances. Chittorgarh was an important region in Mewar\'s history before the move of resistance to the Aravalli hills.'
            },
            {
                keywords: ['chavand', 'chavandgarh', 'capital', 'aravalli', 'hill fortress'],
                answer: 'After setbacks, Pratap established a hill-fortress style base in the Aravalli region—often associated with Chavand. This helped Mewar sustain resistance using difficult terrain, local knowledge, and fast-moving raids.'
            },
            {
                keywords: ['guerrilla', 'guerrilla warfare', 'tactics', 'hit and run', 'hill warfare', 'raids', 'strategy', 'after'],
                answer: 'After Haldighati, Pratap adopted guerrilla tactics: quick raids, surprise attacks, and then withdrawing to safe terrain. This helped keep Mughal control incomplete while preserving Mewar\'s fighting strength.'
            },
            {
                keywords: ['bhil', 'bhils', 'allies', 'bhamashah', 'support', 'tribes'],
                answer: 'Maharana Pratap was supported by Bhil allies, who knew the Aravalli terrain well and helped the resistance survive. Bhamashah is also remembered for supporting Pratap by aiding resources and rebuilding capacity during the prolonged conflict.'
            },
            {
                keywords: ['reconquest', 'recovered', 'udaipur', 'gogunda', 'mandal', 'pandwara', 'outposts', '36'],
                answer: 'As Mughal pressure eased after 1579, Pratap recovered many areas of Mewar, including places like Udaipur, Gogunda, Mandal, and Pandwara (as described in your site pages). By the mid-1580s, he had regained a large number of outposts.'
            },
            {
                keywords: ['death', 'died', 'chavand', 'january 19', '1597', 'hunting'],
                answer: 'Maharana Pratap died on January 19, 1597, at Chavand (as commonly stated). His later years are associated with continued resistance and recovery of territories around Mewar.'
            },
            {
                keywords: ['legacy', 'famous', 'remembered', 'inspire', 'jayanti', 'pratap jayanti', 'valor', 'resistance'],
                answer: 'Maharana Pratap\'s legacy is courage, self-respect, and steadfast resistance against domination. Maharana Pratap Jayanti is celebrated to honor his birth and his place in Rajput and Indian history.'
            },
            {
                keywords: ['timeline', 'dates', 'events', 'when', 'born', '1572', '1576', '1597'],
                answer: 'Key dates: born in 1540 (Kumbhalgarh), became Rana of Mewar in 1572, fought at Haldighati in 1576, established later resistance in the Aravalli region (often linked with Chavand), and died in 1597.'
            }
        ];

        const addAiMessage = (speaker, text, type) => {
            const message = document.createElement('div');
            message.className = `ai-message ai-message-${type}`;

            const name = document.createElement('strong');
            name.textContent = speaker;

            const copy = document.createElement('p');
            copy.textContent = text;

            message.appendChild(name);
            message.appendChild(copy);
            aiWindow.appendChild(message);
            aiWindow.scrollTop = aiWindow.scrollHeight;
        };

        const getAiAnswer = (question) => {
            const normalizedQuestion = question.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;

            aiAnswers.forEach(item => {
                const score = item.keywords.reduce((total, keyword) => {
                    return total + (normalizedQuestion.includes(keyword) ? 1 : 0);
                }, 0);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = item;
                }
            });

            if (bestMatch) {
                return bestMatch.answer;
            }

            return 'I can answer questions about Maharana Pratap\'s biography, Haldighati, Chetak, Mewar, allies, timeline, and legacy.';
        };

        const buildGoogleSearchUrl = (query) => {
            const url = new URL('https://www.google.com/search');
            url.searchParams.set('q', query);
            return url.toString();
        };

        const redirectToGoogleSearch = (query) => {
            const cleanQuery = query.trim();
            if (!cleanQuery) return;
            window.location.href = buildGoogleSearchUrl(cleanQuery);
        };

        const resetAiChat = () => {
            aiWindow.innerHTML = '';
            addAiMessage('Pratap AI', 'Ask me about Maharana Pratap', 'bot');
            aiInput.value = '';
        };

        const askAi = (question) => {
            const cleanQuestion = question.trim();
            if (!cleanQuestion) return;

            addAiMessage('You', cleanQuestion, 'user');
            aiInput.value = '';
            window.setTimeout(() => {
                addAiMessage('Pratap AI', getAiAnswer(cleanQuestion), 'bot');
            }, 250);
        };

        aiForm.addEventListener('submit', event => {
            event.preventDefault();
            redirectToGoogleSearch(aiInput.value);
        });

        aiPrompts.forEach(prompt => {
            prompt.addEventListener('click', () => {
                askAi(prompt.dataset.question || prompt.textContent);
            });
        });

        if (aiNewChatButton) {
            aiNewChatButton.addEventListener('click', resetAiChat);
        }

        // Voice search functionality
        const voiceSearchBtn = document.getElementById('voice-search-btn');
        const cameraBtn = document.getElementById('camera-btn');

        if (voiceSearchBtn) {
            voiceSearchBtn.addEventListener('click', event => {
                event.preventDefault();
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                
                if (!SpeechRecognition) {
                    alert('Voice search is not supported in your browser. Please use Chrome, Edge, or Safari.');
                    return;
                }

                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.continuous = false;
                recognition.interimResults = false;

                voiceSearchBtn.style.color = '#8b0000';
                voiceSearchBtn.style.backgroundColor = 'rgba(139, 0, 0, 0.2)';
                voiceSearchBtn.disabled = true;

                recognition.onstart = () => {
                    voiceSearchBtn.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
                };

                recognition.onresult = event => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        transcript += event.results[i][0].transcript;
                    }
                    
                    if (transcript.trim()) {
                        redirectToGoogleSearch(transcript.trim());
                        aiInput.focus();
                    }
                    
                    voiceSearchBtn.style.backgroundColor = '';
                    voiceSearchBtn.disabled = false;
                };

                recognition.onerror = event => {
                    console.error('Speech recognition error', event.error);
                    voiceSearchBtn.style.backgroundColor = '';
                    voiceSearchBtn.disabled = false;
                };

                recognition.onend = () => {
                    voiceSearchBtn.style.backgroundColor = '';
                    voiceSearchBtn.disabled = false;
                };

                recognition.start();
            });
        }

        if (cameraBtn) {
            cameraBtn.addEventListener('click', event => {
                event.preventDefault();
                alert('Camera search feature coming soon! You will be able to search using images.');
            });
        }

        resetAiChat();
    }

    const contactForm = document.querySelector('.contact-form');
    const contactTribute = document.getElementById('contact-tribute');

    if (contactForm && contactTribute) {
        const contactSubmitButton = contactForm.querySelector('button[type="button"]');
        const contactName = contactForm.querySelector('#name');
        const contactEmail = contactForm.querySelector('#email');
        const contactMessage = contactForm.querySelector('#message');
        const originalSubmitText = contactSubmitButton ? contactSubmitButton.textContent : '';
        const prefersReducedMotion = mediaMatches('(prefers-reduced-motion: reduce)');
        const isSmallScreen = mediaMatches('(max-width: 760px)');
        const tributeImage = contactTribute.querySelector('.tribute-image');
        const contactRecipient = 'infomaharanapratap0@gmail.com';

        const buildContactMailUrl = () => {
            const name = contactName ? contactName.value.trim().replace(/[\r\n]+/g, ' ') : '';
            const email = contactEmail ? contactEmail.value.trim().replace(/[\r\n]+/g, '') : '';
            const message = contactMessage ? contactMessage.value.trim() : '';
            const parameters = new URLSearchParams({
                subject: `Website message from ${name}`,
                body: `Name: ${name}\nReply email: ${email}\n\nMessage:\n${message}`
            });

            return `mailto:${contactRecipient}?${parameters.toString()}`;
        };

        [contactName, contactEmail, contactMessage].forEach(field => {
            if (!field) return;
            field.addEventListener('input', () => field.setCustomValidity(''));
        });

        if (tributeImage && typeof tributeImage.decode === 'function') {
            tributeImage.decode().catch(() => {});
        }

        const composeContactEmail = () => {
            if (contactForm.dataset.tributeReady === 'true') {
                return;
            }

            if (contactName && !contactName.value.trim()) {
                contactName.setCustomValidity('Please enter your name.');
                contactName.reportValidity();
                return;
            }

            if (contactEmail && !contactEmail.checkValidity()) {
                contactEmail.reportValidity();
                return;
            }

            if (contactMessage && !contactMessage.value.trim()) {
                contactMessage.setCustomValidity('Please enter a message.');
                contactMessage.reportValidity();
                return;
            }

            contactForm.dataset.tributeReady = 'true';
            contactTribute.hidden = false;

            window.requestAnimationFrame(() => {
                contactTribute.classList.add('is-visible');

                try {
                    contactTribute.focus({ preventScroll: true });
                } catch (error) {
                    contactTribute.focus();
                }

                contactTribute.scrollIntoView({
                    behavior: prefersReducedMotion ? 'auto' : 'smooth',
                    block: isSmallScreen ? 'center' : 'nearest'
                });
            });

            if (contactSubmitButton) {
                contactSubmitButton.disabled = true;
                contactSubmitButton.textContent = 'Opening Email...';
            }

            window.setTimeout(() => {
                window.location.href = buildContactMailUrl();

                window.setTimeout(() => {
                    contactForm.dataset.tributeReady = 'false';

                    if (contactSubmitButton) {
                        contactSubmitButton.disabled = false;
                        contactSubmitButton.textContent = originalSubmitText;
                    }
                }, 1200);
            }, prefersReducedMotion ? 650 : (isSmallScreen ? 2100 : 1300));
        };

        if (contactSubmitButton) {
            contactSubmitButton.addEventListener('click', composeContactEmail);
        }

        contactForm.addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target !== contactMessage) {
                event.preventDefault();
                composeContactEmail();
            }
        });
    }

    const galleryWindow = document.querySelector('.gallery-window');
    const prevGallery = document.querySelector('.gallery-prev');
    const nextGallery = document.querySelector('.gallery-next');

    if (galleryWindow && prevGallery && nextGallery) {
        const scrollStep = Math.max(320, galleryWindow.offsetWidth * 0.8);
        const shouldAutoScroll = !mediaMatches('(hover: none), (pointer: coarse)');

        const scrollByAmount = (amount) => {
            galleryWindow.scrollBy({ left: amount, behavior: 'smooth' });
        };

        let autoScrollTimer = null;

        const pauseAutoScroll = () => clearInterval(autoScrollTimer);
        const resumeAutoScroll = () => {
            if (!shouldAutoScroll) return;
            clearInterval(autoScrollTimer);
            autoScrollTimer = setInterval(() => {
                if (galleryWindow.scrollLeft + galleryWindow.clientWidth >= galleryWindow.scrollWidth - 10) {
                    galleryWindow.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollByAmount(scrollStep);
                }
            }, 3000);
        };

        resumeAutoScroll();

        galleryWindow.addEventListener('mouseenter', pauseAutoScroll);
        galleryWindow.addEventListener('mouseleave', resumeAutoScroll);
        galleryWindow.addEventListener('touchstart', pauseAutoScroll);
        galleryWindow.addEventListener('touchend', resumeAutoScroll);

        prevGallery.addEventListener('click', () => {
            pauseAutoScroll();
            scrollByAmount(-scrollStep);
            resumeAutoScroll();
        });

        nextGallery.addEventListener('click', () => {
            pauseAutoScroll();
            scrollByAmount(scrollStep);
            resumeAutoScroll();
        });
    }

    const galleryImages = document.querySelectorAll('.scroll-gallery .scroll-item img, .home-scroll-gallery .home-scroll-item img');

    if (galleryImages.length) {
        const lightbox = document.createElement('div');
        lightbox.className = 'gallery-lightbox';
        lightbox.setAttribute('role', 'dialog');
        lightbox.setAttribute('aria-modal', 'true');
        lightbox.setAttribute('aria-label', 'Full size gallery image');
        lightbox.setAttribute('aria-hidden', 'true');
        lightbox.innerHTML = `
            <button type="button" class="gallery-lightbox-close" aria-label="Close image preview">&times;</button>
            <figure class="gallery-lightbox-figure">
                <img class="gallery-lightbox-image" src="" alt="">
                <figcaption class="gallery-lightbox-caption"></figcaption>
            </figure>
        `;
        document.body.appendChild(lightbox);

        const lightboxImage = lightbox.querySelector('.gallery-lightbox-image');
        const lightboxCaption = lightbox.querySelector('.gallery-lightbox-caption');
        const lightboxClose = lightbox.querySelector('.gallery-lightbox-close');
        let focusedBeforeLightbox = null;

        const closeLightbox = () => {
            lightbox.classList.remove('is-open');
            lightbox.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('lightbox-open');
            lightboxImage.removeAttribute('src');

            if (focusedBeforeLightbox) {
                focusedBeforeLightbox.focus();
                focusedBeforeLightbox = null;
            }
        };

        const openLightbox = (image) => {
            focusedBeforeLightbox = document.activeElement;
            const caption = image.closest('.scroll-item, .home-scroll-item')?.querySelector('p')?.textContent.trim() || image.alt || 'Gallery image';

            lightboxImage.src = image.currentSrc || image.src;
            lightboxImage.alt = image.alt || caption;
            lightboxCaption.textContent = caption;
            lightbox.classList.add('is-open');
            lightbox.setAttribute('aria-hidden', 'false');
            document.body.classList.add('lightbox-open');
            lightboxClose.focus();
        };

        galleryImages.forEach(image => {
            image.classList.add('gallery-open-image');
            image.setAttribute('tabindex', '0');
            image.setAttribute('role', 'button');
            image.setAttribute('aria-label', `Open ${image.alt || 'gallery image'} in full view`);

            image.addEventListener('click', () => openLightbox(image));
            image.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openLightbox(image);
                }
            });
        });

        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', event => {
            if (event.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && lightbox.classList.contains('is-open')) {
                closeLightbox();
            }
        });
    }

    // Show upcoming events on button click
    const showOtherBtn = document.getElementById('show-other-events');
    if (showOtherBtn) {
        showOtherBtn.addEventListener('click', () => {
            const upcomingSection = document.getElementById('upcoming-events');
            if (upcomingSection) upcomingSection.classList.add('show');
            showOtherBtn.style.display = 'none'; // Hide button after click
        });
    }

    const learnMoreButton = document.getElementById('learnmore');
    if (learnMoreButton) {
        learnMoreButton.addEventListener('click', toggleContent);
    }

    document.querySelectorAll('.state-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            showStateInfo(tab.dataset.state);
        });
    });

    // Toggle event details on Learn More click
    const eventLinks = document.querySelectorAll('.event-link');
    eventLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const details = link.nextElementSibling;
            if (details && details.classList.contains('event-details')) {
                details.style.display = details.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    // Language switcher
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            const lang = e.target.value;
            const elements = document.querySelectorAll('[data-lang-en]');
            elements.forEach(el => {
                const text = el.getAttribute(`data-lang-${lang}`);
                if (text) el.textContent = text;
            });
        });
    }

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        const toggleBackToTop = () => {
            backToTopBtn.classList.toggle('show', window.scrollY > 240);
        };

        window.addEventListener('scroll', toggleBackToTop, { passive: true });
        toggleBackToTop();

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});




function toggleContent() {
    var content = document.getElementById("extraContent");
    var btnText = document.getElementById("learnmore");

    if (!content || !btnText) {
        return;
    }

    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "block";
        btnText.textContent = "show less";
        showStateInfo("haryana");
    } else {
        content.style.display = "none";
        btnText.textContent = "learn more";
    }
}

function showStateInfo(stateName) {
    var statePanels = document.querySelectorAll(".state-info");
    var stateTabs = document.querySelectorAll(".state-tab");

    statePanels.forEach(function(panel) {
        panel.classList.toggle("active", panel.id === stateName + "-info");
    });

    stateTabs.forEach(function(tab) {
        var isActive = tab.getAttribute("data-state") === stateName;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
}
