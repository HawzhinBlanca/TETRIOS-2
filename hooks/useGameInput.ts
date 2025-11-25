
import { KeyMap, KeyAction } from '../types';
import { useInputStore } from '../stores/inputStore';

export const useGameInput = () => {
    const { controls, setKeyBinding, resetControls } = useInputStore();

    return {
        controls,
        setKeyBinding,
        resetControls
    };
};
