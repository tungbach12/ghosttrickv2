import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to enable drag-to-scroll functionality for a horizontal container
 * @param {React.RefObject} ref - The ref of the scrollable container
 */
export const useDraggableScroll = (ref) => {
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = useCallback((e) => {
    if (!ref.current) return;
    setIsDown(true);
    ref.current.classList.add('grabbing');
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  }, [ref]);

  const onMouseLeave = useCallback(() => {
    setIsDown(false);
    if (ref.current) ref.current.classList.remove('grabbing');
  }, [ref]);

  const onMouseUp = useCallback(() => {
    setIsDown(false);
    if (ref.current) ref.current.classList.remove('grabbing');
  }, [ref]);

  const onMouseMove = useCallback((e) => {
    if (!isDown || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    ref.current.scrollLeft = scrollLeft - walk;
  }, [isDown, ref, scrollLeft, startX]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.addEventListener('mousedown', onMouseDown);
    node.addEventListener('mouseleave', onMouseLeave);
    node.addEventListener('mouseup', onMouseUp);
    node.addEventListener('mousemove', onMouseMove);

    return () => {
      node.removeEventListener('mousedown', onMouseDown);
      node.removeEventListener('mouseleave', onMouseLeave);
      node.removeEventListener('mouseup', onMouseUp);
      node.removeEventListener('mousemove', onMouseMove);
    };
  }, [onMouseDown, onMouseLeave, onMouseMove, onMouseUp, ref]);

  return { isDragging: isDown };
};
