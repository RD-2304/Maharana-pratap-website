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
    
    if (wikiSearchForm && wikiSearchInput) {
        let searchTimeout;
        
        // Real-time search as user types
        wikiSearchInput.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length > 2) {
                wikiResultsContainer.innerHTML = '<div class="wiki-loading">Searching Wikipedia...</div>';
                wikiResultsContainer.classList.remove('hidden');
                
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
        const wikiResultsContainer = document.getElementById('wiki-results-container');
        
        fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`)
            .then(response => response.json())
            .then(data => {
                if (data.query && data.query.search && data.query.search.length > 0) {
                    let html = '';
                    data.query.search.forEach(result => {
                        const safeTitle = escapeHTML(result.title);
                        const safeSnippet = escapeHTML(result.snippet.replace(/<[^>]*>/g, ''));
                        html += `
                            <div class="wiki-result-item" data-title="${safeTitle}">
                                <div class="wiki-result-title">${safeTitle}</div>
                                <div class="wiki-result-excerpt">${safeSnippet}...</div>
                            </div>
                        `;
                    });
                    wikiResultsContainer.innerHTML = html;
                    
                    // Add click handlers to results
                    document.querySelectorAll('.wiki-result-item').forEach(item => {
                        item.addEventListener('click', function() {
                            const title = this.dataset.title;
                            window.open(`https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, '_blank');
                        });
                    });
                } else {
                    wikiResultsContainer.innerHTML = '<div class="wiki-no-results">No results found</div>';
                }
            })
            .catch(error => {
                wikiResultsContainer.innerHTML = '<div class="wiki-error">Error fetching results. Please try again.</div>';
            });
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
            addAiMessage('Pratap AI', 'Ask me about Maharana Pratap\'s life, battles, timeline, Chetak, Mewar, or legacy.', 'bot');
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

        resetAiChat();
    }

    const contactForm = document.querySelector('.contact-form');
    const contactTribute = document.getElementById('contact-tribute');

    if (contactForm && contactTribute) {
        const contactSubmitButton = contactForm.querySelector('button[type="submit"]');
        const originalSubmitText = contactSubmitButton ? contactSubmitButton.textContent : '';
        const prefersReducedMotion = mediaMatches('(prefers-reduced-motion: reduce)');
        const isSmallScreen = mediaMatches('(max-width: 760px)');
        const tributeImage = contactTribute.querySelector('.tribute-image');

        if (tributeImage && typeof tributeImage.decode === 'function') {
            tributeImage.decode().catch(() => {});
        }

        contactForm.addEventListener('submit', event => {
            if (contactForm.dataset.tributeReady === 'true') {
                return;
            }

            event.preventDefault();
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
                HTMLFormElement.prototype.submit.call(contactForm);

                window.setTimeout(() => {
                    contactForm.dataset.tributeReady = 'false';

                    if (contactSubmitButton) {
                        contactSubmitButton.disabled = false;
                        contactSubmitButton.textContent = originalSubmitText;
                    }
                }, 1200);
            }, prefersReducedMotion ? 650 : (isSmallScreen ? 2100 : 1300));
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
        btnText.innerHTML = "show less";
        showStateInfo("haryana");
    } else {
        content.style.display = "none";
        btnText.innerHTML = "learn more";
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
