
import { useState, useEffect, useRef } from 'react';
import { VisualEffectPayload } from '../types';
import { useEngineStore } from '../stores/engineStore';

export const useCameraSystem = (cameraShakeEnabled: boolean, visualEffect: VisualEffectPayload | null) => {
    // State for rendering
    const [cameraTransform, setCameraTransform] = useState({ x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 });
    
    // State for physics calculations (Mutable Refs to avoid stale closures in loop)
    const physicsState = useRef({ x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 });
    const velocity = useRef({ x: 0, y: 0, rx: 0, ry: 0, scale: 0 });
    
    const inputVector = useEngineStore(state => state.inputVector);
    const dangerLevel = useEngineStore(state => state.dangerLevel); 
    const rafRef = useRef<number | null>(null);

    // Apply Camera Impulse based on effects
    useEffect(() => {
        if (!cameraShakeEnabled || !visualEffect) return;
        
        if (visualEffect.type === 'SHAKE') {
            const intensity = visualEffect.payload === 'hard' ? 20 : 8;
            velocity.current.y += intensity;
            velocity.current.scale += 0.02;
            velocity.current.rx += (Math.random() - 0.5) * 5;
        } else if (visualEffect.type === 'FRENZY_START') {
            velocity.current.scale += 0.1;
        } else if (visualEffect.type === 'ROW_CLEAR') {
            velocity.current.scale -= 0.05; // Punch out on clear for relief
        }
    }, [visualEffect, cameraShakeEnabled]);

    // Camera Physics Loop (Spring/Decay + Input Tilt + Dynamic Zoom)
    useEffect(() => {
        if (!cameraShakeEnabled) {
            setCameraTransform({ x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 });
            physicsState.current = { x: 0, y: 0, rotateX: 0, rotateY: 0, scale: 1 };
            velocity.current = { x: 0, y: 0, rx: 0, ry: 0, scale: 0 };
            return;
        }

        // Constants
        const SPRING = 0.1;
        const DAMPING = 0.85;
        const TILT_AMOUNT = 2.5;
        const PAN_AMOUNT = 10;

        const updateCamera = () => {
            const current = physicsState.current;
            
            // Dynamic Zoom Target: Base 1.0
            // Zoom IN as danger increases (up to 1.1x) to create tension
            const targetZoom = 1.0 + (Math.max(0, dangerLevel - 0.2) * 0.15);
            
            const targetRy = inputVector.x * TILT_AMOUNT;
            const targetX = -inputVector.x * PAN_AMOUNT;
            const targetRx = inputVector.y * TILT_AMOUNT;
            
            // Physics Integration
            const ax = (targetX - current.x) * SPRING;
            velocity.current.x = (velocity.current.x + ax) * DAMPING;
            current.x += velocity.current.x;
            
            const ay = (0 - current.y) * SPRING;
            velocity.current.y = (velocity.current.y + ay) * DAMPING;
            current.y += velocity.current.y;

            const arx = (targetRx - current.rotateX) * SPRING;
            velocity.current.rx = (velocity.current.rx + arx) * DAMPING;
            current.rotateX += velocity.current.rx;

            const ary = (targetRy - current.rotateY) * SPRING;
            velocity.current.ry = (velocity.current.ry + ary) * DAMPING;
            current.rotateY += velocity.current.ry;

            // Scale Zoom physics
            const as = (targetZoom - current.scale) * SPRING;
            velocity.current.scale = (velocity.current.scale + as) * DAMPING;
            current.scale += velocity.current.scale;

            // Sync to React State
            setCameraTransform({ ...current });

            rafRef.current = requestAnimationFrame(updateCamera);
        };
        
        rafRef.current = requestAnimationFrame(updateCamera);
        
        return () => { 
            if(rafRef.current) cancelAnimationFrame(rafRef.current); 
        };
    }, [cameraShakeEnabled, inputVector, dangerLevel]);

    return cameraTransform;
};
