import { useState, useEffect } from 'react';

export default function FloatingDonateButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Obtener la posición del formulario de donación
      const donationForm = document.getElementById('formulario-donacion');
      
      if (donationForm) {
        const formRect = donationForm.getBoundingClientRect();
        // Mostrar el botón solo cuando el usuario ha pasado completamente la sección del formulario
        const hasPassed = formRect.bottom < 0;
        setIsVisible(hasPassed);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    const element = document.getElementById('formulario-donacion');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        fixed bottom-6 right-6 z-50
        bg-gradient-to-r from-orange-500 to-orange-600
        text-white font-bold
        px-6 py-4
        rounded-full shadow-2xl
        flex items-center justify-center gap-3
        transition-all duration-300 ease-out
        hover:shadow-orange-500/50 hover:scale-105 hover:from-orange-600 hover:to-orange-700
        active:scale-95
        sm:bottom-6 sm:right-6 sm:px-6 sm:py-4 sm:text-base
        max-sm:bottom-4 max-sm:right-4 max-sm:px-5 max-sm:py-3 max-sm:text-sm
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}
      `}
      style={{
        minWidth: 'fit-content',
      }}
      aria-label="Ir al formulario de donación"
    >
      {/* Ícono de corazón SVG */}
      <svg 
        className="w-5 h-5 flex-shrink-0 max-sm:w-4 max-sm:h-4"
        viewBox="0 0 24 24" 
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      
      <span className="whitespace-nowrap">
        Donar Ahora
      </span>
    </button>
  );
}