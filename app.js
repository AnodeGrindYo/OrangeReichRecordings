// import * as THREE from 'three';
// import WaveSurfer from 'wavesurfer';
const THREE = window.THREE;
const WaveSurfer = window.WaveSurfer;


document.addEventListener('DOMContentLoaded', () => {
    // Music Player State
    const state = {
        tracks: [],
        currentTrackIndex: 0,
        isPlaying: false,
        isShuffled: false,
        isRepeating: false,
        volume: 0.7,
        audioContext: null,
        analyser: null,
        dataArray: null
    };

    // DOM Elements
    const playBtn = document.getElementById('play-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const volumeControl = document.getElementById('volume');
    const repeatBtn = document.getElementById('repeat-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const downloadBtn = document.getElementById('download-btn');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');
    const trackList = document.getElementById('track-list');

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#8f8f8f',
        progressColor: '#ff6600',
        cursorColor: '#ffffff',
        barWidth: 2,
        barRadius: 2,
        cursorWidth: 0,
        height: 200,
        barGap: 2,
        responsive: true,
        interact: true,
        normalize: true,
        partialRender: true,
    });

    // Initialize Audio Visualizer with Three.js
    const visualizer = initVisualizer();

    // Fetch tracks from GitHub repository
    fetchTracks();

    // Event Listeners
    playBtn.addEventListener('click', togglePlay);
    prevBtn.addEventListener('click', playPreviousTrack);
    nextBtn.addEventListener('click', playNextTrack);
    volumeControl.addEventListener('input', updateVolume);
    repeatBtn.addEventListener('click', toggleRepeat);
    shuffleBtn.addEventListener('click', toggleShuffle);
    downloadBtn.addEventListener('click', downloadCurrentTrack);
    progressBar.addEventListener('click', seekTrack);

    // WaveSurfer Events
    wavesurfer.on('ready', () => {
        updateTrackInfo();
        wavesurfer.setVolume(state.volume);

        if (!state.audioContext) {
            setupAudioAnalyser();
        }
        
        if (state.isPlaying) {
            wavesurfer.play();
            updatePlayButton(true);
            animateVisualizer();
        }
        
        displayDuration(wavesurfer.getDuration());
    });

    wavesurfer.on('audioprocess', updateProgress);
    wavesurfer.on('finish', onTrackFinish);
    
    // Functions
    function fetchTracks() {
        // GitHub API: Get contents of tracks directory
        fetch('https://api.github.com/repos/AnodeGrindYo/OrangeReichRecordings/contents/tracks')
            .then(response => response.json())
            .then(data => {
                // Filter only .wav files
                state.tracks = data
                    .filter(file => file.name.toLowerCase().endsWith('.wav'))
                    .map(file => ({
                        name: file.name.replace('.wav', ''), // Remove extension for display
                        url: file.download_url,
                        artist: extractArtistFromFilename(file.name)
                    }));
                
                if (state.tracks.length > 0) {
                    renderTrackList();
                    loadTrack(0);
                } else {
                    trackList.innerHTML = '<div class="loading">Aucun morceau trouvé</div>';
                }
            })
            .catch(error => {
                console.error('Error fetching tracks:', error);
                trackList.innerHTML = '<div class="loading">Erreur lors du chargement des morceaux</div>';
            });
    }

    function extractArtistFromFilename(filename) {
        // Attempt to extract artist from filename format: "Artist - Title.wav"
        const parts = filename.split(' - ');
        if (parts.length > 1) {
            return parts[0];
        }
        return 'Orange Reich Recordings';
    }

    function renderTrackList() {
        trackList.innerHTML = '';
        
        state.tracks.forEach((track, index) => {
            const trackCard = document.createElement('div');
            trackCard.className = 'track-card';
            trackCard.dataset.index = index;
            
            if (index === state.currentTrackIndex) {
                trackCard.classList.add('current-track');
            }
            
            trackCard.innerHTML = `
                <div class="track-card-image">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6.5A5.5,5.5 0 0,1 17.5,12A5.5,5.5 0 0,1 12,17.5A5.5,5.5 0 0,1 6.5,12A5.5,5.5 0 0,1 12,6.5M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
                    </svg>
                </div>
                <div class="playing-indicator">PLAYING</div>
                <div class="track-card-content">
                    <h3 class="track-card-title">${track.name}</h3>
                    <p class="track-card-artist">${track.artist}</p>
                    <div class="track-card-buttons">
                        <button class="play-track-btn" title="Play">
                            <i class="fas fa-play"></i> Play
                        </button>
                        <button class="download-track-btn" title="Download">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
            
            trackList.appendChild(trackCard);
            
            // Add click event to the track card
            trackCard.querySelector('.play-track-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(trackCard.dataset.index);
                if (index === state.currentTrackIndex && state.isPlaying) {
                    wavesurfer.pause();
                    updatePlayButton(false);
                } else {
                    loadTrack(index);
                    wavesurfer.play();
                    updatePlayButton(true);
                }
            });
            
            trackCard.querySelector('.download-track-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                downloadTrack(track);
            });
        });
    }

    function loadTrack(index) {
        if (index < 0 || index >= state.tracks.length) return;
        
        state.currentTrackIndex = index;
        const track = state.tracks[index];
        
        // Update UI
        trackTitle.textContent = 'Chargement...';
        trackArtist.textContent = track.artist;
        
        // Load audio file
        wavesurfer.load(track.url);
        
        // Mark current track in the list
        document.querySelectorAll('.track-card').forEach(card => {
            card.classList.remove('current-track');
        });
        
        const currentCard = document.querySelector(`.track-card[data-index="${index}"]`);
        if (currentCard) {
            currentCard.classList.add('current-track');
            currentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function updateTrackInfo() {
        const track = state.tracks[state.currentTrackIndex];
        trackTitle.textContent = track.name;
        trackArtist.textContent = track.artist;
    }

    function togglePlay() {
        if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
            updatePlayButton(false);
            state.isPlaying = false;
        } else {
            wavesurfer.play();
            updatePlayButton(true);
            state.isPlaying = true;
            if (state.audioContext && state.analyser) {
                animateVisualizer();
            }
        }
    }

    function updatePlayButton(isPlaying) {
        const icon = playBtn.querySelector('i');
        if (isPlaying) {
            icon.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
        }
    }

    function playPreviousTrack() {
        let index = state.currentTrackIndex - 1;
        if (index < 0) index = state.tracks.length - 1;
        loadTrack(index);
        if (state.isPlaying) {
            wavesurfer.play();
        }
    }

    function playNextTrack() {
        let index;
        if (state.isShuffled) {
            index = Math.floor(Math.random() * state.tracks.length);
        } else {
            index = (state.currentTrackIndex + 1) % state.tracks.length;
        }
        loadTrack(index);
        if (state.isPlaying) {
            wavesurfer.play();
        }
    }

    function onTrackFinish() {
        if (state.isRepeating) {
            wavesurfer.play();
        } else {
            playNextTrack();
        }
    }

    function updateVolume() {
        const volume = parseFloat(volumeControl.value);
        wavesurfer.setVolume(volume);
        state.volume = volume;
    }

    function toggleRepeat() {
        state.isRepeating = !state.isRepeating;
        repeatBtn.classList.toggle('active', state.isRepeating);
        if (state.isRepeating) {
            repeatBtn.style.color = '#ff6600';
        } else {
            repeatBtn.style.color = '';
        }
    }

    function toggleShuffle() {
        state.isShuffled = !state.isShuffled;
        shuffleBtn.classList.toggle('active', state.isShuffled);
        if (state.isShuffled) {
            shuffleBtn.style.color = '#ff6600';
        } else {
            shuffleBtn.style.color = '';
        }
    }

    function downloadCurrentTrack() {
        const track = state.tracks[state.currentTrackIndex];
        downloadTrack(track);
    }

    function downloadTrack(track) {
        const a = document.createElement('a');
        a.href = track.url;
        a.download = `${track.name}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function seekTrack(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        wavesurfer.seekTo(percent);
    }

    function updateProgress() {
        const currentTime = wavesurfer.getCurrentTime();
        const duration = wavesurfer.getDuration();
        const percent = (currentTime / duration) * 100;
        
        progress.style.width = `${percent}%`;
        currentTimeDisplay.textContent = formatTime(currentTime);
    }

    function displayDuration(duration) {
        durationDisplay.textContent = formatTime(duration);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secondsRemainder = Math.floor(seconds % 60);
        return `${minutes}:${secondsRemainder.toString().padStart(2, '0')}`;
    }

    function setupAudioAnalyser() {
        try {
            // Make sure backend exists before trying to access it
            if (!wavesurfer.backend || !wavesurfer.backend.ac) {
                console.warn("Audio backend not available yet");
                return;
            }
            
            // Create audio context and analyzer
            state.audioContext = wavesurfer.backend.ac;
            state.analyser = state.audioContext.createAnalyser();
            state.analyser.fftSize = 256;
            
            wavesurfer.backend.setFilters([state.analyser]);
            
            const bufferLength = state.analyser.frequencyBinCount;
            state.dataArray = new Uint8Array(bufferLength);
        } catch (error) {
            console.error("Error setting up audio analyser:", error);
        }
    }

    function initVisualizer() {
        const container = document.getElementById('canvas-container');
        
        // Initialize Three.js scene
        const scene = new THREE.Scene();
        
        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 20;
        
        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);
        
        // Create visualizer elements
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            wireframe: true
        });
        
        const bars = [];
        const barCount = 64; // Number of bars to display
        
        for (let i = 0; i < barCount; i++) {
            const bar = new THREE.Mesh(geometry, material);
            const angle = (i / barCount) * Math.PI * 2;
            const radius = 8;
            
            bar.position.x = Math.cos(angle) * radius;
            bar.position.y = Math.sin(angle) * radius;
            bar.scale.y = 1;
            
            scene.add(bar);
            bars.push(bar);
        }
        
        // Handle resize
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        
        // Animation function
        function animate() {
            // Only continue the animation if we're playing music
            if (!state.isPlaying) return;
            
            requestAnimationFrame(animate);
            
            if (state.analyser && state.dataArray) {
                state.analyser.getByteFrequencyData(state.dataArray);
                
                // Update bars based on frequency data
                for (let i = 0; i < bars.length; i++) {
                    const index = Math.floor(i * state.dataArray.length / bars.length);
                    const value = state.dataArray[index] / 128.0;
                    
                    bars[i].scale.y = value * 5 || 0.1; // Minimum height to keep bars visible
                    
                    // Colorize based on frequency intensity
                    const hue = (i / bars.length) * 60 + 15; // Orange-ish hues (15-75)
                    const saturation = 100;
                    const lightness = 40 + value * 20; // Brighter for louder sounds
                    
                    bars[i].material.color.setHSL(hue/360, saturation/100, lightness/100);
                }
                
                // Rotate the entire scene
                scene.rotation.y += 0.005;
                scene.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
                
                // Apply audio reactivity to UI elements
                applyAudioReactiveEffects(state.dataArray);
            }
            
            renderer.render(scene, camera);
        }
        
        return { animate, scene, camera, renderer, bars };
    }

    function animateVisualizer() {
        if (visualizer && state.isPlaying) {
            visualizer.animate();
        }
    }

    function applyAudioReactiveEffects(dataArray) {
        if (!dataArray) return;
        
        // Get average frequency values for different bands
        const bassAvg = getAverageFrequency(dataArray, 0, 10);
        const midAvg = getAverageFrequency(dataArray, 10, 100);
        const highAvg = getAverageFrequency(dataArray, 100, dataArray.length - 1);
        
        // Overall volume level (0-1)
        const bassLevel = bassAvg / 255;
        const midLevel = midAvg / 255;
        const highLevel = highAvg / 255;
        const overallLevel = (bassLevel + midLevel + highLevel) / 3;
        
        // Make the current track card pulse with the beat
        const currentTrackCard = document.querySelector('.track-card.current-track');
        if (currentTrackCard) {
            currentTrackCard.classList.add('audio-reactive', 'reactive');
            
            // Scale based on bass
            const scale = 1 + bassLevel * 0.05;
            currentTrackCard.style.transform = `scale(${scale})`;
            
            // Add pulsing effect on strong beats
            if (bassLevel > 0.6) {
                currentTrackCard.classList.add('pulsing');
            } else {
                currentTrackCard.classList.remove('pulsing');
            }
        }
        
        // Make other UI elements react
        document.querySelectorAll('.control-buttons button').forEach(button => {
            // Subtle movement on mid frequencies
            const shift = midLevel * 3;
            button.style.transform = `translateY(${shift}px)`;
        });
        
        // Make the progress bar react to high frequencies
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.style.boxShadow = `0 0 ${10 * highLevel}px rgba(255, 102, 0, ${0.5 + highLevel * 0.5})`;
        }
        
        // Change background intensity based on overall level
        document.body.style.backgroundColor = `rgb(${10 + overallLevel * 5}, ${10 + overallLevel * 5}, ${10 + overallLevel * 5})`;
        
        // Apply visual effect to the vignette based on bass
        const vignette = document.querySelector('.vignette-overlay');
        if (vignette) {
            vignette.style.boxShadow = `inset 0 0 ${150 + bassLevel * 100}px rgba(0, 0, 0, ${0.9 - bassLevel * 0.3})`;
        }
    }

    function getAverageFrequency(dataArray, startIndex, endIndex) {
        let sum = 0;
        let count = 0;
        
        for (let i = startIndex; i <= endIndex && i < dataArray.length; i++) {
            sum += dataArray[i];
            count++;
        }
        
        return count > 0 ? sum / count : 0;
    }
});