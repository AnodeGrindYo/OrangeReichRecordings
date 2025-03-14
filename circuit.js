class CircuitAnimator {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            lineColor: options.lineColor || 'rgba(255, 107, 0, 0.7)',
            backgroundColor: options.backgroundColor || 'transparent',
            nodeColor: options.nodeColor || 'rgba(255, 107, 0, 0.9)',
            lineWidth: options.lineWidth || 2,
            nodeSize: options.nodeSize || 4,
            nodeCount: options.nodeCount || 20,
            speed: options.speed || 0.5,
            pulseSpeed: options.pulseSpeed || 3,
            complexity: options.complexity || 0.7, // 0-1, higher means more connections
            animate: options.animate !== undefined ? options.animate : true,
            responsive: options.responsive !== undefined ? options.responsive : true,
            audioReactive: options.audioReactive !== undefined ? options.audioReactive : false,
            reactivity: options.reactivity || 0.5
        };
        
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.nodes = [];
        this.connections = [];
        this.pulses = [];
        this.resizeCanvas();
        this.initCircuit();
        
        if (this.options.responsive) {
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        
        if (this.options.animate) {
            this.animate();
        } else {
            this.draw();
        }
    }
    
    resizeCanvas() {
        this.canvas.width = this.container.offsetWidth;
        this.canvas.height = this.container.offsetHeight;
        if (!this.options.animate) {
            this.initCircuit();
            this.draw();
        }
    }
    
    initCircuit() {
        // Reset
        this.nodes = [];
        this.connections = [];
        this.pulses = [];
        
        // Create nodes
        const nodeCount = Math.min(this.options.nodeCount, 100); // Limit for performance
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: this.options.nodeSize + Math.random() * this.options.nodeSize * 0.5
            });
        }
        
        // Create connections
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const connections = [];
            
            // Find nearest nodes to connect
            const potentialConnections = [...this.nodes]
                .filter((_, index) => index !== i)
                .map((target, index) => {
                    const distance = Math.sqrt(
                        Math.pow(node.x - target.x, 2) + 
                        Math.pow(node.y - target.y, 2)
                    );
                    return { index, distance };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, Math.ceil(3 * this.options.complexity));
            
            // Add some randomness to connection selection
            potentialConnections.forEach(conn => {
                if (Math.random() < this.options.complexity) {
                    connections.push(conn.index);
                }
            });
            
            this.connections.push(connections);
        }
        
        // Create initial pulses
        this.createRandomPulses(5);
    }
    
    createRandomPulses(count) {
        for (let i = 0; i < count; i++) {
            this.createPulse(Math.floor(Math.random() * this.nodes.length));
        }
    }
    
    createPulse(startNodeIndex) {
        if (this.connections[startNodeIndex].length === 0) return;
        
        const targetNodeIndex = this.connections[startNodeIndex][
            Math.floor(Math.random() * this.connections[startNodeIndex].length)
        ];
        
        this.pulses.push({
            startNode: startNodeIndex,
            targetNode: targetNodeIndex,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02 * this.options.pulseSpeed,
            color: this.options.lineColor
        });
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        if (this.options.backgroundColor !== 'transparent') {
            this.ctx.fillStyle = this.options.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Draw connections
        this.ctx.strokeStyle = this.options.lineColor;
        this.ctx.lineWidth = this.options.lineWidth;
        
        for (let i = 0; i < this.nodes.length; i++) {
            const start = this.nodes[i];
            for (const connIndex of this.connections[i]) {
                const end = this.nodes[connIndex];
                this.ctx.beginPath();
                this.ctx.moveTo(start.x, start.y);
                
                // Add slight curves to some connections for more organic feel
                if (Math.random() > 0.7) {
                    const midX = (start.x + end.x) / 2;
                    const midY = (start.y + end.y) / 2;
                    const offset = 20 * Math.random() - 10;
                    this.ctx.quadraticCurveTo(
                        midX + offset, 
                        midY + offset, 
                        end.x, 
                        end.y
                    );
                } else {
                    this.ctx.lineTo(end.x, end.y);
                }
                
                this.ctx.stroke();
            }
        }
        
        // Draw pulses
        for (const pulse of this.pulses) {
            const start = this.nodes[pulse.startNode];
            const end = this.nodes[pulse.targetNode];
            
            const x = start.x + (end.x - start.x) * pulse.progress;
            const y = start.y + (end.y - start.y) * pulse.progress;
            
            // Pulse glow
            const gradient = this.ctx.createRadialGradient(
                x, y, 0, 
                x, y, this.options.nodeSize * 3
            );
            gradient.addColorStop(0, this.options.lineColor);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.options.nodeSize * 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Pulse core
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.options.nodeSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw nodes
        for (const node of this.nodes) {
            // Node glow
            const gradient = this.ctx.createRadialGradient(
                node.x, node.y, 0, 
                node.x, node.y, node.size * 1.5
            );
            gradient.addColorStop(0, this.options.nodeColor);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.size * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Node core
            this.ctx.fillStyle = this.options.nodeColor;
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    animate() {
        this.draw();
        
        // Audio reactivity
        let energyFactor = 1;
        if (this.options.audioReactive && window.audioAnalyzer) {
            energyFactor = 1 + (window.audioAnalyzer.getEnergy() * this.options.reactivity);
        }
        
        // Update pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const pulse = this.pulses[i];
            pulse.progress += pulse.speed * energyFactor;
            
            if (pulse.progress >= 1) {
                this.pulses.splice(i, 1);
                
                // Chance to create a new pulse
                if (Math.random() < 0.7) {
                    this.createPulse(pulse.targetNode);
                }
            }
        }
        
        // Ensure we always have some pulses
        if (Math.random() < 0.05 * energyFactor && this.pulses.length < 20) {
            this.createPulse(Math.floor(Math.random() * this.nodes.length));
        }
        
        requestAnimationFrame(() => this.animate());
    }
}