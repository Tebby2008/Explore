
import React, { useEffect, useRef } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../constants';

const MenuBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef(0);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        let frameId = 0;
        
        // Static elements
        const floorPattern = document.createElement('canvas');
        floorPattern.width = 50; floorPattern.height = 50;
        const fCtx = floorPattern.getContext('2d')!;
        fCtx.fillStyle = '#292524'; fCtx.fillRect(0,0,50,50);
        fCtx.fillStyle = '#1c1917'; fCtx.fillRect(0,0,25,25); fCtx.fillRect(25,25,25,25);

        const loop = (t: number) => {
            timeRef.current = t;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw Background Room
            const ptrn = ctx.createPattern(floorPattern, 'repeat');
            ctx.fillStyle = ptrn || '#292524';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw Vignette/Lighting
            ctx.save();
            const cx = CANVAS_WIDTH/2;
            const cy = CANVAS_HEIGHT/2;
            
            // Random flickering light source sweeping
            const lightX = cx + Math.sin(t / 2000) * 300;
            const lightY = cy + Math.cos(t / 1500) * 200;
            
            // Shadows
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(0,0,CANVAS_WIDTH, CANVAS_HEIGHT);

            // Cut out light
            ctx.globalCompositeOperation = 'destination-out';
            const flicker = 0.9 + Math.random() * 0.2;
            
            ctx.beginPath();
            ctx.arc(lightX, lightY, 150 * flicker, 0, Math.PI * 2);
            ctx.fill();

            // Flashlight beam
            const angle = Math.atan2(cy - lightY, cx - lightX) + Math.PI; // Point towards center roughly
            ctx.beginPath();
            ctx.moveTo(lightX, lightY);
            ctx.arc(lightX, lightY, 600, angle - 0.4, angle + 0.4);
            ctx.lineTo(lightX, lightY);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            
            // Draw some floating particles/dust
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            for(let i=0; i<20; i++) {
                const px = (t/10 + i*100) % CANVAS_WIDTH;
                const py = (t/20 + i*50 * Math.sin(i)) % CANVAS_HEIGHT;
                ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
            }

            // Draw a silhouette occasionally passing by
            if (Math.sin(t/3000) > 0.95) {
                const sx = CANVAS_WIDTH + 100 - ((t%3000)/3000 * (CANVAS_WIDTH+200));
                const sy = cy + 50;
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(sx, sy, 30, 0, Math.PI*2); // Body
                ctx.arc(sx, sy-30, 15, 0, Math.PI*2); // Head
                ctx.fill();
                // Red Eyes
                ctx.fillStyle = '#ef4444';
                ctx.beginPath(); ctx.arc(sx-5, sy-35, 2, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(sx+5, sy-35, 2, 0, Math.PI*2); ctx.fill();
            }

            ctx.restore();
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, []);

    return <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm scale-110" />;
};

export default MenuBackground;
