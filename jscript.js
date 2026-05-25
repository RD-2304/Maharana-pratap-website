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



        const resetAiChat = () => {
            aiWindow.innerHTML = '';
            addAiMessage('Pratap AI', 'Ask me about Maharana Pratap', 'bot');
            aiInput.value = '';
        };

        const askAi = (question) => {
            const cleanQuestion = (question || '').toString().trim();
            if (!cleanQuestion) return;

            // Defensive: also block inside AI flow (voice + prompt clicks)
            if (isBlockedQuery(cleanQuestion)) {
                addAiWarning('Sorry, this site only supports educational/history questions.Please don\'t use these kind of slangs or explicit terms here.');
                return;
            }

            addAiMessage('You', cleanQuestion, 'user');
            aiInput.value = '';
            window.setTimeout(() => {
                addAiMessage('Pratap AI', getAiAnswer(cleanQuestion), 'bot');
            }, 250);
        };


        const blockedSexualQueryRegexes = [
            // English explicit + common variants
            /\bsex\b/i,
            /\bsexual\b/i,
            /\bintercourse\b/i,
            /\bmake\s*love\b/i,
            /\bfuck\b/i,
            /\bfucked\b/i,
            /\bfucking\b/i,
            /\bmotherfucker\b/i,
            /\bshit\b/i,
            // Obfuscations (basic leetspeak-ish patterns)
            /f\s*u\s*c\s*k/i,
            /s\s*e\s*x/i,
            // Anatomy/explicit terms (generic blocking)
            /\bpenis\b/i,
            /\btesticles\b/i,
            /\bclitoris\b/i,
            /\bvagina\b/i,
            /\bboobs\b/i,
            /\bbreasts\b/i,
            /\bnudes\b/i,
            /\bnsfw\b/i,
            // Sexual acts (generic)
            /\bblow\s*job\b/i,
            /\bhandjob\b/i,
            /\bjerk\s*off\b/i,
            /\bhot\s*sex\b/i,       
            /\bpussy\b/i,
            /\bdick\b/i,
            /\bass\b/i,
            /\bcock\b/i,
            /\bslut\b/i,
            /\bwhore\b/i,
            /\bfag\b/i, 
            /\bcunt\b/i,
             // Add more patterns as needed
            /\bprostitute\b/i,
            /\bporno\b/i,
            /\bpornography\b/i,
            /\bporono\b/i,
            /\bporn\b/i,
            /\bxxx\b/i,
            /\badult\b/i,
            /\berotic\b/i,
            /\bnaked\b/i,
            /\bsex\s*worker\b/i,
            /\bescort\b/i,
            /\bstripper\b/i,
            /\bbhenchod\b/i,  
            /\blulla\b/i,
            /\bgandu\b/i,
            /\bchutiya\b/i,
            /\bpillu\b/i,
            /\bchod\b/i,
            /\bmadarchod\b/i,
            /\btatti\b/i,
            /\bgand\b/i,
            /\bgandmar\b/i,
             // Add more Hindi/Indian language explicit terms as needed
             /\bchoda\b/i,
             /\bchodi\b/i,
             /\bchoddi\b/i,
             /\bchudai\b/i,
             /\bmuth\b/i,
             /\bmuthai\b/i,
             /\bchus\b/i,
             /\bpronography\b/i,
             /\bsexually explicit\b/i,
             /\badult content\b/i,
             /\bsexual content\b/i,
             /\bchatur\b/i,
             /\bchaturbhuj\b/i,
             /\bchaturbhuj\b/i,
             /\bbhosadi\b/i,
             /\bbhosadiwala\b/i,
             /\bbhosadiwale\b/i,
             /\bbhosadiwalon\b/i,
             /\bbhosadiwal\b/i,
             /\bbhosadiwale\b/i,
             /\bchatu\b\b/i,
             /\bchatur\b/i,
             /\bchaturbhuj\b/i,
             /\bhutiya\b/i,
             /\bhutiyapa\b/i,
            /\bhutiyap\b/i,
            /\bprono\b/i,
            
        
        ];

        const normalizeUserQuery = (q) => {
            let s = (q || '').toString();
            // Normalize common unicode/hidden characters and whitespace for consistent blocking
            s = s.replace(/\u200B|\u200C|\u200D|\uFEFF/g, ''); // zero-width chars
            s = s.replace(/\s+/g, ' ').trim();
            return s.toLowerCase();
        };

        const isBlockedQuery = (q) => {
            const s = normalizeUserQuery(q);
            if (!s.trim()) return false;
            return blockedSexualQueryRegexes.some(rx => rx.test(s));
        };


        const addAiWarning = (text) => {
            addAiMessage('Pratap AI', text, 'bot');
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

        const safeRedirectToGoogleSearch = (query) => {
            const clean = (query || '').trim();
            if (!clean) return;

            if (isBlockedQuery(clean)) {
                addAiWarning('Sorry, this site only supports educational/history questions.Please don\'t use these kind of slangs or explicit terms here.');
                return;
            }

            redirectToGoogleSearch(clean);
        };

        aiForm.addEventListener('submit', event => {
            event.preventDefault();
            safeRedirectToGoogleSearch(aiInput.value);
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

                    const cleanTranscript = (transcript || '').trim();
                    if (cleanTranscript) {
                        if (isBlockedQuery(cleanTranscript)) {
                            addAiWarning('Sorry, this site only supports educational/history questions . Please don\'t use these kind of slangs or explicit terms here.');
                        } else {
                            askAi(cleanTranscript);
                            aiInput.focus();
                        }

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
