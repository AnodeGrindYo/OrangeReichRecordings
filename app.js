import * as Tone from 'tone';

class AudioAnalyzer {
    constructor(player) {
        this.player = player;
        this.meter = new Tone.Meter();
        this.fft = new Tone.FFT(128);
        this.waveform = new Tone.Waveform(1024);
        this.player.connect(this.meter);
        this.player.connect(this.fft);
        this.player.connect(this.waveform);
        this.smoothedValue = 0;
        this.smoothingFactor = 0.8;
        
        // Create visualizer bars
        this.createVisualizer();
    }
    
    createVisualizer() {
        const visualizer = document.createElement('div');
        visualizer.className = 'visualizer';
        
        // Create 32 bars for the visualizer
        for (let i = 0; i < 32; i++) {
            const bar = document.createElement('div');
            bar.className = 'visualizer-bar';
            visualizer.appendChild(bar);
        }
        
        document.querySelector('.player-info').appendChild(visualizer);
    }
    
    getVolume() {
        return this.meter.getValue();
    }
    
    getEnergy() {
        this.smoothedValue = this.smoothedValue * this.smoothingFactor + 
                            Math.abs(this.getVolume()) * (1 - this.smoothingFactor);
        return Math.min(1, Math.max(0, (this.smoothedValue + 100) / 70));
    }
    
    getSpectrum() {
        return this.fft.getValue();
    }
    
    updateVisualizer() {
        if (!this.player.loaded || !this.player.playing) return;
        
        const spectrum = this.fft.getValue();
        const bars = document.querySelectorAll('.visualizer-bar');
        const energyLevel = this.getEnergy();
        
        // Update player highlights
        document.querySelector('.player').classList.toggle('active', energyLevel > 0.5);
        
        // Get a subset of spectrum values for visualization
        const spectrumSlice = spectrum.slice(0, Math.min(bars.length, spectrum.length));
        
        // Update bars based on FFT data
        for (let i = 0; i < bars.length; i++) {
            const index = Math.floor(i * (spectrumSlice.length / bars.length));
            const value = spectrumSlice[index];
            // Convert dB value to height percentage (dB is typically negative)
            const height = Math.max(3, ((value + 100) / 70) * 40);
            bars[i].style.height = `${height}px`;
            
            // Add color variation based on frequency
            const hue = (i / bars.length) * 60 + 10; // Orange-ish range
            bars[i].style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        }
    }
}

// Create circuit animations
document.addEventListener('DOMContentLoaded', () => {
    // Add the script tag for circuit.js
    const scriptTag = document.createElement('script');
    scriptTag.src = 'circuit.js';
    document.head.appendChild(scriptTag);
    
    scriptTag.onload = () => {
        // Initialize background circuit animation
        new CircuitAnimator('circuitBackground', {
            lineColor: 'rgba(255, 107, 0, 0.3)',
            nodeColor: 'rgba(255, 107, 0, 0.5)',
            lineWidth: 1,
            nodeSize: 3,
            nodeCount: 30,
            speed: 0.2,
            complexity: 0.5,
            audioReactive: true,
            reactivity: 0.7
        });
        
        // Initialize header circuit animation
        new CircuitAnimator('headerCircuit', {
            lineColor: 'rgba(255, 255, 255, 0.3)',
            nodeColor: 'rgba(255, 255, 255, 0.6)',
            lineWidth: 2,
            nodeSize: 3,
            nodeCount: 20,
            speed: 0.5,
            complexity: 0.7,
            audioReactive: true,
            reactivity: 1.2
        });
    };
});

class MusicPlayer {
    constructor() {
        this.tracks = [];
        this.currentTrackIndex = -1;
        this.player = new Tone.Player().toDestination();
        this.isPlaying = false;
        
        this.loadLocalTracks();
        this.initializeControls();
    }

    generateCover(trackId) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.height = 300;

        // Génération procédurale de la pochette
        const gradient = ctx.createLinearGradient(0, 0, 300, 300);
        gradient.addColorStop(0, `hsl(${Math.random() * 360}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${Math.random() * 360}, 70%, 20%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 300);

        // Ajout de formes géométriques
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
            ctx.moveTo(Math.random() * 300, Math.random() * 300);
            ctx.lineTo(Math.random() * 300, Math.random() * 300);
            ctx.lineTo(Math.random() * 300, Math.random() * 300);
            ctx.closePath();
            ctx.fill();
        }

        return canvas.toDataURL();
    }

    async loadLocalTracks() {
        const repoOwner = "AnodeGrindYo";
        const repoName = "OrangeReichRecordings";
        const folderPath = "tracks";
        const baseUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${folderPath}/`;
    
        try {
            // Récupération des fichiers dans `tracks/`
            const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${folderPath}`);
            if (!response.ok) throw new Error('Impossible de charger les fichiers');
    
            const files = await response.json();
    
            // Filtrer uniquement les fichiers .wav
            const trackList = files
                .filter(file => file.name.endsWith(".wav"))
                .map(file => ({
                    title: file.name.replace(".wav", "").replace(/_/g, " "),
                    url: baseUrl + file.name
                }));
    
            if (trackList.length === 0) {
                throw new Error('Aucun fichier WAV trouvé.');
            }
    
            // Mettre à jour le player avec les morceaux récupérés
            player.tracks = trackList;
            player.renderTracks();
        } catch (error) {
            console.error('Erreur lors du chargement des morceaux:', error);
            document.getElementById('trackList').innerHTML = `<div class="error">Erreur: ${error.message}</div>`;
        }
    }
    
    
    async loadFromManifest() {
        try {
            // Try to load a tracks.json manifest file as fallback
            const response = await fetch('/tracks/tracks.json');
            if (!response.ok) {
                throw new Error('No tracks directory listing or manifest file found');
            }
            
            const tracksData = await response.json();
            this.tracks = tracksData.map(track => ({
                id: Math.random().toString(36).substr(2, 9),
                artist: track.artist,
                title: track.title,
                fullTitle: `${track.artist} - ${track.title}`,
                url: `/tracks/${track.filename || `${track.artist} - ${track.title}.wav`}`
            }));
            
            if (this.tracks.length === 0) {
                throw new Error('No tracks found in manifest');
            }
            
            console.log('Loaded tracks from manifest:', this.tracks);
            this.renderTracks();
        } catch (error) {
            console.error('Error loading manifest:', error);
            document.getElementById('trackList').innerHTML = `<div class="error">Error loading tracks: ${error.message}<br>Place your WAV files in a 'tracks' folder at the root of your GitHub Pages site.</div>`;
        }
    }
    
    initializeControls() {
        document.getElementById('shuffleAll').addEventListener('click', () => this.shuffleAll());
        document.getElementById('playPause').addEventListener('click', () => this.togglePlay());
        document.getElementById('prevTrack').addEventListener('click', () => this.previousTrack());
        document.getElementById('nextTrack').addEventListener('click', () => this.nextTrack());
        
        // Mise à jour de la barre de progression
        setInterval(() => {
            if (this.isPlaying) {
                const progress = (this.player.currentTime / this.player.buffer.duration) * 100;
                document.getElementById('progress').style.width = `${progress}%`;
            }
        }, 100);
    }

    renderTracks() {
        const trackList = document.getElementById('trackList');
        trackList.innerHTML = '';

        if (this.tracks.length === 0) {
            trackList.innerHTML = '<div class="error">No tracks found. Please try again later.</div>';
            return;
        }

        this.tracks.forEach((track, index) => {
            const card = document.createElement('div');
            card.className = 'track-card';
            card.innerHTML = `
                <div class="track-art" style="background-image: url('${this.generateCover(track.id)}'); background-size: cover;"></div>
                <div class="track-info">
                    <div class="track-title">${track.fullTitle || track.title}</div>
                    <div class="track-artist">${track.artist || ''}</div>
                    <div class="track-buttons">
                        <button onclick="player.playTrack(${index})">PLAY</button>
                        <button onclick="player.downloadTrack(${index})">DOWNLOAD</button>
                    </div>
                </div>
            `;
            trackList.appendChild(card);
        });
    }

    async playTrack(index) {
        // Remove playing class from all cards
        document.querySelectorAll('.track-card').forEach(card => {
            card.classList.remove('playing-track');
        });
        
        if (this.currentTrackIndex === index && this.isPlaying) {
            await this.player.stop();
            this.isPlaying = false;
            document.getElementById('playPause').textContent = '⏯';
            return;
        }

        this.currentTrackIndex = index;
        const track = this.tracks[index];
        
        try {
            if (!track.url) {
                throw new Error('Track URL is missing. Please visit cors-anywhere.herokuapp.com for temporary access.');
            }
            
            document.getElementById('currentTrack').textContent = 'Loading...';
            await this.player.load(track.url);
            
            // Initialize audio analyzer if not already created
            if (!window.audioAnalyzer) {
                window.audioAnalyzer = new AudioAnalyzer(this.player);
                
                // Start visualization loop
                this.startVisualization();
            }
            
            await this.player.start();
            this.isPlaying = true;
            document.getElementById('currentTrack').textContent = track.fullTitle || track.title;
            document.getElementById('playPause').textContent = '⏸';
            
            // Add playing class to current track card
            const trackCards = document.querySelectorAll('.track-card');
            if (trackCards[index]) {
                trackCards[index].classList.add('playing-track');
            }
        } catch (error) {
            console.error('Error playing track:', error);
            document.getElementById('currentTrack').textContent = `Error: ${error.message}`;
        }
    }
    
    startVisualization() {
        const updateVisualization = () => {
            if (window.audioAnalyzer) {
                window.audioAnalyzer.updateVisualizer();
            }
            requestAnimationFrame(updateVisualization);
        };
        updateVisualization();
    }

    async togglePlay() {
        if (this.currentTrackIndex === -1) return;
        
        if (this.isPlaying) {
            await this.player.pause();
            document.getElementById('playPause').textContent = '⏯';
        } else {
            await this.player.start();
            document.getElementById('playPause').textContent = '⏸';
        }
        this.isPlaying = !this.isPlaying;
    }

    async previousTrack() {
        if (this.currentTrackIndex > 0) {
            await this.playTrack(this.currentTrackIndex - 1);
        }
    }

    async nextTrack() {
        if (this.currentTrackIndex < this.tracks.length - 1) {
            await this.playTrack(this.currentTrackIndex + 1);
        }
    }

    shuffleAll() {
        const shuffledIndices = [...Array(this.tracks.length).keys()]
            .sort(() => Math.random() - 0.5);
        this.playQueue = shuffledIndices;
        this.playTrack(this.playQueue[0]);
    }

    downloadTrack(index) {
        const track = this.tracks[index];
        const link = document.createElement('a');
        link.href = track.url;
        link.download = `${track.fullTitle || track.title}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

window.player = new MusicPlayer();