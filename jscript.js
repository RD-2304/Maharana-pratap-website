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
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => {
        body.setAttribute('data-theme', theme);

        if (!themeToggle) return;

        const isDark = theme === 'dark';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        const icon = themeToggle.querySelector('.theme-toggle-icon');
        const label = themeToggle.querySelector('.theme-toggle-label');

        if (icon) {
            icon.textContent = isDark ? '🌙' : '☀️';
        }

        if (label) {
            label.textContent = isDark ? 'Dark' : 'Theme';
        }
    };

    const preferredTheme = safeStorageGet('siteTheme');
    const initialTheme = preferredTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(initialTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const nextTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            safeStorageSet('siteTheme', nextTheme);
        });
    }

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
    const aiAdvancedModeButton = document.getElementById('ai-advanced-mode-btn');

    if (aiForm && aiInput && aiWindow) {
        const aiSubmitButton = aiForm.querySelector('button[type="submit"]');
        let advancedModeEnabled = safeStorageGet('pratapAiAdvancedMode') === 'true';
        let aiRequestToken = 0;

        const aiAnswers = [
            {
                keywords: ['who was', 'about', 'biography', 'maharanapratap', 'pratap', 'introduction'],
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

        const aiAdvancedFacts = [
            {
                keywords: ['who', 'about', 'biography', 'maharanapratap', 'pratap', 'introduction'],
                facts: [
                    'He was born in 1540 at Kumbhalgarh Fort in the Sisodia Rajput family of Mewar.',
                    'He became ruler of Mewar in 1572 after the death of Udai Singh II.',
                    'His reign is remembered for resistance against Mughal expansion under Akbar.',
                    'He rebuilt strength from the Aravalli hills instead of accepting submission.'
                ],
                context: 'His story is not only about one battle. It is about a long political and military struggle to protect Mewar identity, sovereignty, and morale.',
                conclusion: 'Maharana Pratap became a lasting symbol of courage because he chose hardship and resistance over surrender.'
            },
            {
                keywords: ['battle', 'haldighati', 'haldighati yuddh', 'war', 'akbar', 'mughal', 'man singh'],
                facts: [
                    'The Battle of Haldighati was fought in 1576 near Gogunda in the Haldighati pass.',
                    'Maharana Pratap faced Mughal forces led by Man Singh I of Amber.',
                    'The Mughals held the battlefield, but they did not capture Pratap.',
                    'After the battle, Pratap continued resistance from the hills instead of ending the struggle.'
                ],
                context: 'Haldighati matters because it shows the difference between winning ground for a day and permanently subduing a kingdom. Pratap survived, regrouped, and kept Mewar politically alive.',
                conclusion: 'The battle became famous because Pratap did not allow one military setback to become final defeat.'
            },
            {
                keywords: ['chetak', 'horse', 'wounded', 'rawat jhala', 'escape', 'loyalty', 'courage'],
                facts: [
                    'Chetak is remembered in popular tradition as Maharana Pratap\'s loyal horse.',
                    'The best-known story says Chetak carried the wounded Pratap away after Haldighati.',
                    'Rawat Jhala is also remembered for helping draw danger away during the crisis.',
                    'The story represents loyalty, sacrifice, and the emotional bond between warrior and companion.'
                ],
                context: 'Some details come from heroic tradition, but the story remains powerful because it expresses the values people associate with Pratap: duty, bravery, and loyalty under pressure.',
                conclusion: 'Chetak became more than a horse in memory; he became a symbol of devotion in the Maharana Pratap story.'
            },
            {
                keywords: ['guerrilla', 'guerrilla warfare', 'tactics', 'hit and run', 'hill warfare', 'raids', 'strategy', 'after'],
                facts: [
                    'Pratap used the Aravalli terrain to avoid fighting only on Mughal terms.',
                    'His forces relied on fast movement, surprise raids, and withdrawal to difficult ground.',
                    'Local allies and knowledge of hills, forests, and passes helped his resistance survive.',
                    'This strategy allowed Mewar to recover strength even when the plains were under pressure.'
                ],
                context: 'His strategy was practical. A smaller force could not always defeat a larger empire in open battle, so Pratap used terrain, timing, and endurance as weapons.',
                conclusion: 'The guerrilla strategy helped turn survival into recovery for Mewar.'
            },
            {
                keywords: ['bhamashah', 'bhil', 'allies', 'support', 'resources', 'financing', 'tribes'],
                facts: [
                    'Bhamashah is remembered for providing crucial financial support to Pratap.',
                    'Bhil allies helped with terrain knowledge, mobility, and local support.',
                    'The resistance depended on more than royal soldiers; it needed networks, supplies, and trust.',
                    'These alliances helped Pratap keep fighting during the hardest years.'
                ],
                context: 'A long resistance cannot survive on courage alone. Food, money, intelligence, shelter, and local cooperation are what keep a campaign alive.',
                conclusion: 'Bhamashah and the Bhil allies show that Pratap\'s struggle was supported by a wider Mewar community.'
            },
            {
                keywords: ['mewar', 'kingdom', 'rule', 'rana', 'chittorgarh', 'chavand', 'aravalli', 'capital'],
                facts: [
                    'Mewar was Pratap\'s kingdom in present-day Rajasthan.',
                    'Chittorgarh was central to Mewar history, while later resistance operated from hill regions.',
                    'Chavand is associated with Pratap\'s later base and recovery efforts.',
                    'The Aravalli hills gave Mewar defensive depth against a stronger imperial army.'
                ],
                context: 'Mewar was not just land to Pratap; it represented dynasty, duty, and independence. Protecting it meant adapting the capital, military style, and political life to harsh conditions.',
                conclusion: 'Mewar survived because Pratap turned difficult geography into a source of strength.'
            },
            {
                keywords: ['death', 'died', 'chavand', 'january 19', '1597', 'hunting', 'aftermath', 'after'],
                facts: [
                    'Maharana Pratap died on January 19, 1597, at Chavand according to common accounts.',
                    'His successor was Amar Singh I.',
                    'By his later years, Pratap had recovered important parts of Mewar.',
                    'His final legacy was continued resistance and the instruction to preserve Mewar independence.'
                ],
                context: 'His death did not erase the cause he represented. The memory of his refusal to submit continued through his family, later Rajput memory, and modern public culture.',
                conclusion: 'Pratap is remembered because his life ended, but his example of self-respect continued.'
            },
            {
                keywords: ['legacy', 'famous', 'remembered', 'inspire', 'jayanti', 'pratap jayanti', 'valor', 'resistance'],
                facts: [
                    'He is celebrated as a national and Rajput hero.',
                    'Maharana Pratap Jayanti honors his birth and his resistance.',
                    'Statues, stories, films, poems, and school lessons keep his memory alive.',
                    'His legacy is tied to courage, independence, loyalty, and refusal to surrender.'
                ],
                context: 'People remember Pratap because his story gives a clear moral image: a ruler who accepted hardship to defend honor and autonomy.',
                conclusion: 'His legacy remains strong because it speaks to bravery, dignity, and love for homeland.'
            },
            {
                keywords: ['timeline', 'dates', 'events', 'when', 'born', '1572', '1576', '1597'],
                facts: [
                    '1540: Birth at Kumbhalgarh Fort.',
                    '1572: Accession as Rana of Mewar.',
                    '1576: Battle of Haldighati.',
                    'After 1576: Hill resistance and recovery campaigns.',
                    '1597: Death at Chavand.'
                ],
                context: 'The timeline shows a steady arc: birth into royal duty, accession during crisis, a famous battle, years of resistance, and a legacy that outlived him.',
                conclusion: 'The key dates make Pratap\'s life easier to understand as a long struggle, not a single event.'
            }
        ];

        const defaultAdvancedFacts = [
            'Maharana Pratap was a ruler of Mewar from 1572 to 1597.',
            'He is best known for resisting Mughal dominance under Emperor Akbar.',
            'The Battle of Haldighati in 1576 became the most famous event of his life.',
            'His later resistance relied on the Aravalli hills, loyal allies, and guerrilla tactics.'
        ];

        const scrollToLatestAiMessage = () => {
            const latestMessage = aiWindow.querySelector('.ai-message:last-child');
            if (!latestMessage) return;

            const section = document.getElementById('ai-assistant');
            const targetY = latestMessage.getBoundingClientRect().top + window.pageYOffset - 90;

            window.scrollTo({
                top: Math.max(0, targetY),
                behavior: 'smooth'
            });

            if (section && section.getBoundingClientRect().top < 0) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };

        const addAiMessage = (speaker, text, type, options = {}) => {
            const shouldScroll = options.scrollTo === true;
            const message = document.createElement('div');
            message.className = `ai-message ai-message-${type}`;

            const name = document.createElement('strong');
            name.textContent = speaker;

            const copy = document.createElement('p');
            copy.className = 'ai-message-content';
            copy.textContent = text;

            message.appendChild(name);
            message.appendChild(copy);
            aiWindow.appendChild(message);
            aiWindow.scrollTop = aiWindow.scrollHeight;

            if (shouldScroll) {
                window.requestAnimationFrame(() => {
                    scrollToLatestAiMessage();
                });
            }
        };

        const addAiLoadingMessage = (label = 'Thinking') => {
            const message = document.createElement('div');
            message.className = 'ai-message ai-message-bot ai-message-loading';
            message.setAttribute('role', 'status');

            const name = document.createElement('strong');
            name.textContent = 'Pratap AI';

            const loading = document.createElement('span');
            loading.className = 'ai-loading';

            const text = document.createElement('span');
            text.textContent = label;

            const dots = document.createElement('span');
            dots.className = 'ai-loading-dots';
            dots.setAttribute('aria-hidden', 'true');

            for (let i = 0; i < 3; i += 1) {
                dots.appendChild(document.createElement('span'));
            }

            loading.appendChild(text);
            loading.appendChild(dots);
            message.appendChild(name);
            message.appendChild(loading);
            aiWindow.appendChild(message);
            aiWindow.scrollTop = aiWindow.scrollHeight;
            aiWindow.setAttribute('aria-busy', 'true');

            return message;
        };

        const removeAiLoadingMessage = (message) => {
            if (message && message.parentNode) {
                message.parentNode.removeChild(message);
            }

            aiWindow.setAttribute('aria-busy', 'false');
        };

        const setAiFormBusy = (isBusy) => {
            if (aiSubmitButton) {
                aiSubmitButton.disabled = isBusy;
            }

            aiForm.classList.toggle('is-loading', isBusy);
        };

        const wait = (milliseconds) => new Promise(resolve => {
            window.setTimeout(resolve, milliseconds);
        });

        const scoreKeywordList = (normalizedQuestion, keywords) => {
            return keywords.reduce((total, keyword) => {
                const normalizedKeyword = keyword.toLowerCase();
                const weight = normalizedKeyword.includes(' ') ? 2 : 1;
                return total + (normalizedQuestion.includes(normalizedKeyword) ? weight : 0);
            }, 0);
        };

        const getBestKeywordMatch = (items, question) => {
            const normalizedQuestion = question.toLowerCase();
            let bestMatch = null;
            let bestScore = 0;

            items.forEach(item => {
                const score = scoreKeywordList(normalizedQuestion, item.keywords);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = item;
                }
            });

            return bestMatch;
        };

        const getAiAnswer = (question) => {
            const bestMatch = getBestKeywordMatch(aiAnswers, question);

            if (bestMatch) {
                return bestMatch.answer;
            }

            return 'I can answer questions about Maharana Pratap\'s biography, Haldighati, Chetak, Mewar, allies, timeline, and legacy.';
        };

        const uniqueList = (items) => {
            const seen = new Set();
            return items.filter(item => {
                if (!item || seen.has(item)) return false;
                seen.add(item);
                return true;
            });
        };

        const trimToSentences = (text, sentenceLimit) => {
            const cleaned = (text || '').replace(/\s+/g, ' ').trim();
            if (!cleaned) return '';

            const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
            if (!sentences) {
                return cleaned.length > 700 ? `${cleaned.slice(0, 700).trim()}...` : cleaned;
            }

            return sentences.slice(0, sentenceLimit).join(' ').trim();
        };

        const buildAdvancedLocalAnswer = (question, bestMatch) => {
            const advancedMatch = getBestKeywordMatch(aiAdvancedFacts, question);
            const facts = uniqueList([
                ...((advancedMatch && advancedMatch.facts) || []),
                ...defaultAdvancedFacts
            ]).slice(0, 7);

            const overview = bestMatch
                ? bestMatch.answer
                : 'I can answer from the Maharana Pratap history knowledge built into this site.';
            const context = advancedMatch
                ? advancedMatch.context
                : 'This topic connects to the larger story of Maharana Pratap: Mewar independence, resistance under pressure, and the memory of Rajput courage.';
            const conclusion = advancedMatch
                ? advancedMatch.conclusion
                : 'The main idea is that Pratap is remembered for courage, endurance, and refusal to surrender Mewar autonomy.';

            return `${overview}\n\nKey details:\n- ${facts.join('\n- ')}\n\nContext:\n${context}\n\nConclusion:\n${conclusion}`;
        };

        const buildAdvancedFallbackAnswer = (question) => {
            return `I could not find a strong built-in match for "${question}", but I can still keep the answer inside this chat.\n\nTry asking with a clearer topic name, a person, a place, or a historical event. For the strongest answers on this site, ask about Maharana Pratap, Haldighati, Chetak, Mewar, Chavand, Bhamashah, Bhil allies, timeline, death, or legacy.\n\nConclusion:\nThis static website can answer from its built-in history knowledge and in-page knowledge lookup, but it does not include a private live AI model yet.`;
        };

        const getConversationAnswer = (question, isAdvanced) => {
            const normalized = normalizeUserQuery(question);

            if (/^(hi|hello|hey|namaste|jai|jai hind|jai maharana)/.test(normalized)) {
                return isAdvanced
                    ? 'Namaste. I am ready to answer in Advanced Mode with a detailed response.\n\nYou can ask about Maharana Pratap, Haldighati, Chetak, Mewar, Rajput history, or another clear topic.'
                    : 'Namaste. Ask me anything about Maharana Pratap or a history topic.';
            }

            if (/\b(thank you|thanks|dhanyavaad|shukriya)\b/.test(normalized)) {
                return 'You are welcome. Jai Maharana Pratap.';
            }

            return null;
        };

        const getSimpleCalculationAnswer = (question, isAdvanced) => {
            const normalized = question.toLowerCase().replace(/,/g, '');
            const match = normalized.match(/(-?\d+(?:\.\d+)?)\s*(\+|-|\*|x|\/|plus|minus|times|multiplied by|divided by)\s*(-?\d+(?:\.\d+)?)/);
            if (!match) return null;

            const left = Number(match[1]);
            const operator = match[2];
            const right = Number(match[3]);
            let result;
            let label;

            if (operator === '+' || operator === 'plus') {
                result = left + right;
                label = 'addition';
            } else if (operator === '-' || operator === 'minus') {
                result = left - right;
                label = 'subtraction';
            } else if (operator === '*' || operator === 'x' || operator === 'times' || operator === 'multiplied by') {
                result = left * right;
                label = 'multiplication';
            } else {
                if (right === 0) {
                    return 'Division by zero is undefined.';
                }

                result = left / right;
                label = 'division';
            }

            const roundedResult = Number.isInteger(result) ? String(result) : String(Number(result.toFixed(6)));
            const shortAnswer = `${left} ${operator} ${right} = ${roundedResult}.`;

            if (!isAdvanced) {
                return shortAnswer;
            }

            return `${shortAnswer}\n\nSteps:\n- Identify the operation: ${label}.\n- Use the two numbers: ${left} and ${right}.\n- Calculate the result: ${roundedResult}.\n\nConclusion:\nThe answer is ${roundedResult}.`;
        };

        const fetchWikipediaTopic = async (question) => {
            if (typeof window.fetch !== 'function') return null;

            const query = question.replace(/[?!]+$/g, '').trim();
            if (query.length < 2) return null;

            const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
            searchUrl.searchParams.set('action', 'query');
            searchUrl.searchParams.set('list', 'search');
            searchUrl.searchParams.set('srsearch', query);
            searchUrl.searchParams.set('srlimit', '1');
            searchUrl.searchParams.set('format', 'json');
            searchUrl.searchParams.set('origin', '*');

            const searchResponse = await fetch(searchUrl.toString(), { credentials: 'omit' });
            if (!searchResponse.ok) return null;

            const searchData = await searchResponse.json();
            const title = searchData &&
                searchData.query &&
                searchData.query.search &&
                searchData.query.search[0] &&
                searchData.query.search[0].title;

            if (!title) return null;

            const extractUrl = new URL('https://en.wikipedia.org/w/api.php');
            extractUrl.searchParams.set('action', 'query');
            extractUrl.searchParams.set('prop', 'extracts');
            extractUrl.searchParams.set('exintro', '1');
            extractUrl.searchParams.set('explaintext', '1');
            extractUrl.searchParams.set('redirects', '1');
            extractUrl.searchParams.set('titles', title);
            extractUrl.searchParams.set('format', 'json');
            extractUrl.searchParams.set('origin', '*');

            const extractResponse = await fetch(extractUrl.toString(), { credentials: 'omit' });
            if (!extractResponse.ok) return null;

            const extractData = await extractResponse.json();
            const pages = extractData && extractData.query && extractData.query.pages
                ? Object.values(extractData.query.pages)
                : [];
            const page = pages.find(item => item && item.extract);

            if (!page) return null;

            return {
                title: page.title || title,
                extract: page.extract
            };
        };

        const buildWikipediaAnswer = (question, topic, isAdvanced) => {
            const summary = trimToSentences(topic.extract, isAdvanced ? 6 : 2);
            if (!summary) return null;

            if (!isAdvanced) {
                return `${topic.title}: ${summary}`;
            }

            return `Here is a detailed in-page answer for "${question}".\n\nOverview:\n${summary}\n\nRemember :\n- The Ai is currently under development. So it make mistake in answering questions. \n- If the question needs current news, medical, legal, or financial decisions, verify it with a trusted current source.\n\n`;
        };

        const resolveAiAnswer = async (question, options = {}) => {
            const isAdvanced = options.advanced === true;
            const conversationAnswer = getConversationAnswer(question, isAdvanced);
            if (conversationAnswer) return conversationAnswer;

            const calculationAnswer = getSimpleCalculationAnswer(question, isAdvanced);
            if (calculationAnswer) return calculationAnswer;

            const bestMatch = getBestKeywordMatch(aiAnswers, question);

            if (bestMatch) {
                return isAdvanced ? buildAdvancedLocalAnswer(question, bestMatch) : getAiAnswer(question);
            }

            try {
                const wikiTopic = await fetchWikipediaTopic(question);
                const wikiAnswer = wikiTopic ? buildWikipediaAnswer(question, wikiTopic, isAdvanced) : null;

                if (wikiAnswer) {
                    return wikiAnswer;
                }
            } catch (error) {
                console.error('AI knowledge lookup failed', error);
            }

            return isAdvanced
                ? buildAdvancedFallbackAnswer(question)
                : 'I can answer inside this chat. Try asking about Maharana Pratap, Haldighati, Chetak, Mewar, or type a clear topic name for a general answer.';
        };
        const resetAiChat = () => {
            aiRequestToken += 1;
            setAiFormBusy(false);
            aiWindow.setAttribute('aria-busy', 'false');
            aiWindow.innerHTML = '';
            addAiMessage('Pratap AI', 'Ask me anything about Maharana Pratap or another clear topic.', 'bot');
            aiInput.value = '';
        };

        const askAi = async (question) => {
            const cleanQuestion = (question || '').toString().trim();
            if (!cleanQuestion) return;

            // Defensive: also block inside AI flow (voice + prompt clicks)
            if (isBlockedQuery(cleanQuestion)) {
                addAiWarning('Sorry, this site only supports educational/history questions.Please don\'t use these kind of slangs,offensive language or explicit terms here.');
                return;
            }

            addAiMessage('You', cleanQuestion, 'user');
            aiInput.value = '';
            const requestToken = aiRequestToken + 1;
            aiRequestToken = requestToken;
            const isAdvanced = advancedModeEnabled;
            const loadingMessage = addAiLoadingMessage(isAdvanced ? 'Building full answer' : 'Thinking');
            setAiFormBusy(true);

            try {
                const minimumDelay = isAdvanced ? 650 : 350;
                const answer = await Promise.all([
                    resolveAiAnswer(cleanQuestion, { advanced: isAdvanced }),
                    wait(minimumDelay)
                ]).then(results => results[0]);

                if (requestToken !== aiRequestToken) {
                    removeAiLoadingMessage(loadingMessage);
                    return;
                }

                removeAiLoadingMessage(loadingMessage);
                addAiMessage('Pratap AI', answer, 'bot', { scrollTo: true });
            } catch (error) {
                console.error('AI answer failed', error);

                if (requestToken === aiRequestToken) {
                    removeAiLoadingMessage(loadingMessage);
                    addAiMessage('Pratap AI', 'Sorry, I could not prepare that answer right now. Please try again with a simpler question.', 'bot', { scrollTo: true });
                }
            } finally {
                if (requestToken === aiRequestToken) {
                    setAiFormBusy(false);
                }
            }
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
            /\bbhenchodd\b/i,
            /\bchut\b/i,
            /\bchutt\b/i,
            /\blust\b/i,
            /\bsexeducation\b/i,
            /\bluststories\b/i,
            /\blust stories\b/i,
        
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
            addAiMessage('Pratap AI', text, 'bot', { scrollTo: true });
        };

        const updateAdvancedModeUi = () => {
            aiForm.classList.toggle('is-advanced', advancedModeEnabled);

            if (aiAdvancedModeButton) {
                aiAdvancedModeButton.classList.toggle('is-active', advancedModeEnabled);
                aiAdvancedModeButton.setAttribute('aria-pressed', String(advancedModeEnabled));
                aiAdvancedModeButton.title = advancedModeEnabled ? 'Advanced mode on' : 'Advanced mode';
                aiAdvancedModeButton.setAttribute('aria-label', advancedModeEnabled ? 'Turn off advanced mode' : 'Turn on advanced mode');
            }

            aiInput.placeholder = advancedModeEnabled ? 'Ask for a full answer' : 'Ask Anything';

            if (aiSubmitButton) {
                aiSubmitButton.textContent = advancedModeEnabled ? 'Ask Advanced' : 'Ask AI';
            }
        };

        aiForm.addEventListener('submit', event => {
            event.preventDefault();
            askAi(aiInput.value);
        });


        aiPrompts.forEach(prompt => {
            prompt.addEventListener('click', () => {
                askAi(prompt.dataset.question || prompt.textContent);
            });
        });

        if (aiNewChatButton) {
            aiNewChatButton.addEventListener('click', resetAiChat);
        }

        if (aiAdvancedModeButton) {
            aiAdvancedModeButton.addEventListener('click', event => {
                event.preventDefault();
                advancedModeEnabled = !advancedModeEnabled;
                safeStorageSet('pratapAiAdvancedMode', String(advancedModeEnabled));
                updateAdvancedModeUi();
            });
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

        updateAdvancedModeUi();
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
