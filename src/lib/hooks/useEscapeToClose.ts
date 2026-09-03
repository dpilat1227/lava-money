import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Web-only Escape-to-close for hand-rolled overlays (`Dialog`, account
 * detail's bottom `Sheet`) that are a plain `View` + backdrop `Pressable`,
 * not React Native's real `Modal`. RN Web's actual `Modal` already wires
 * Escape to `onRequestClose` for free (confirmed -- `EditBudgetModal` and
 * Settings' `AddCategoryModal` already close on Escape without any extra
 * code); these hand-rolled ones just never got the equivalent listener.
 */
export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
}
