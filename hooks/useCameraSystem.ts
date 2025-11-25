
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
    const rafRef = useRef<number | null>(null);

    // Apply Camera Impulse based on effects
    useEffect(() => {
        if (!cameraShakeEnabled || !visualEffect) return;
        
        if (visualEffect.type === 'SHAKE') {
            const intensity = visualEffect.payload === 'hard' ? 20 : 8;
            // Add instant impulse
            velocity.current.y += intensity;
            velocity.current.scale += 0.02;
            velocity.current.rx += (Math.random() - 0.5) * 5;
        } else if (visualEffect.type === 'FRENZY_START') {
            velocity.current.scale += 0.1;
        }
    }, [visualEffect, cameraShakeEnabled]);

    // Camera Physics Loop (Spring/Decay + Input Tilt)
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
        const TILT_AMOUNT = 2.5; // Degrees of tilt per input
        const PAN_AMOUNT = 10; // Pixels of pan per input

        const updateCamera = () => {
            const current = physicsState.current;
            
            // Calculate Target based on Input
            const targetRy = inputVector.x * TILT_AMOUNT; // Tilt left/right
            const targetX = -inputVector.x * PAN_AMOUNT; // Pan opposite
            const targetRx = inputVector.y * TILT_AMOUNT; // Tilt down on soft drop
            const targetScale = 1;

            // Physics Integration
            // X Position
            const ax = (targetX - current.x) * SPRING;
            velocity.current.x = (velocity.current.x + ax) * DAMPING;
            current.x += velocity.current.x;
            
            // Y Position (Shake primarily affects this, target is 0)
            const ay = (0 - current.y) * SPRING;
            velocity.current.y = (velocity.current.y + ay) * DAMPING;
            current.y += velocity.current.y;

            // Rotate X (Tilt Up/Down)
            const arx = (targetRx - current.rotateX) * SPRING;
            velocity.current.rx = (velocity.current.rx + arx) * DAMPING;
            current.rotateX += velocity.current.rx;

            // Rotate Y (Tilt Left/Right)
            const ary = (targetRy - current.rotateY) * SPRING;
            velocity.current.ry = (velocity.current.ry + ary) * DAMPING;
            current.rotateY += velocity.current.ry;

            // Scale
            const as = (targetScale - current.scale) * SPRING;
            velocity.current.scale = (velocity.current.scale + as) * DAMPING;
            current.scale += velocity.current.scale;

            // Sync to React State for render
            setCameraTransform({ ...current });

            rafRef.current = requestAnimationFrame(updateCamera);
        };
        
        rafRef.current = requestAnimationFrame(updateCamera);
        
        return () => { 
            if(rafRef.current) cancelAnimationFrame(rafRef.current); 
        };
    }, [cameraShakeEnabled, inputVector]); // Dependencies

    return cameraTransform;
};
