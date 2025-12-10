
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Panel Hostal Loreto Belén',
        short_name: 'Loreto Belén',
        description: 'Panel de reservas y gestión interna del Hostal Loreto Belén en Puerto Natales.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
            {
                src: '/logo-pagina.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}
