import '../styles/main.css';
import '../styles/participants.css';
import { initCarousel } from '../ui/carousel';
import { initTeam } from '../ui/team';

initCarousel({
    autoplay: false,
    onChange: (index, total) => {
        const status = document.getElementById('about-slide-status');
        if (status) status.textContent = `${index + 1} / ${total}`;
    },
});

initTeam();
