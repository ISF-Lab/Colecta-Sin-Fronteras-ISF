/**
 * Componente que verifica el estado de una donación
 * Si no está pagada, redirige a la página principal
 */

import { useEffect } from 'react';
import { checkDonationStatus } from '../lib/api';

interface DonationStatusCheckerProps {
  orderId: string;
  backendUrl: string;
}

export default function DonationStatusChecker({
  orderId,
  backendUrl,
}: DonationStatusCheckerProps) {
  useEffect(() => {
    const verifyDonation = async () => {
      if (!orderId || !backendUrl) {
        console.warn('[DonationStatusChecker] Faltan parámetros');
        return;
      }

      try {
        const result = await checkDonationStatus(backendUrl, orderId);

        if (!result.ok) {
          console.error('[DonationStatusChecker] Error verificando donación:', result.error);
          // Si hay error, redirigir a la página principal por seguridad
          window.location.href = '/';
          return;
        }

        // Si la donación no está pagada, redirigir a la página principal
        if (!result.pagado) {
          console.log('[DonationStatusChecker] Donación no pagada, redirigiendo...');
          window.location.href = '/';
          return;
        }

        // Si está pagada, no hacer nada (mostrar la página de gracias)
        console.log('[DonationStatusChecker] Donación pagada correctamente');
      } catch (error) {
        console.error('[DonationStatusChecker] Error inesperado:', error);
        // En caso de error, redirigir a la página principal por seguridad
        window.location.href = '/';
      }
    };

    verifyDonation();
  }, [orderId, backendUrl]);

  // Este componente no renderiza nada
  return null;
}

