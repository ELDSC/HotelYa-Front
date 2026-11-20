import '../styles/main.css';
import '../styles/nosotros.css';
import { initCarousel } from '../ui/carousel';
import { initOrgChart } from '../ui/team';

initCarousel({
    autoplay: false,
    onChange: (index, total) => {
        const status = document.getElementById('about-slide-status');
        if (status) status.textContent = `${index + 1} / ${total}`;
    },
});

initOrgChart();
