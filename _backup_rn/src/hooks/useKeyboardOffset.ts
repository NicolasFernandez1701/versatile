import { useEffect, useRef } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';

export const useKeyboardOffset = () => {
  const translateY = useRef(new Animated.Value(0)).current;
  const keyboardVisible = useRef(false);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        if (keyboardVisible.current) return;
        keyboardVisible.current = true;

        const keyboardHeight = event?.endCoordinates?.height || 0;
        // Empujamos hacia arriba la mitad de la altura del teclado para centrar mejor
        Animated.timing(translateY, {
          toValue: -keyboardHeight / 3,
          duration: event?.duration || 250,
          useNativeDriver: true,
        }).start();
      }
    );

    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (!keyboardVisible.current) return;
        keyboardVisible.current = false;

        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return translateY;
};
