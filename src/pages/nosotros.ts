import '../styles/main.css';
import '../styles/nosotros.css';
import { initCarousel } from '../ui/carousel';

initCarousel({
    autoplay: false,
    onChange: (index, total) => {
        const status = document.getElementById('about-slide-status');
        if (status) status.textContent = `${index + 1} / ${total}`;
    },
});
