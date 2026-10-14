export function initVideoPlayer(): void {
    const hotelVideo = document.querySelector<HTMLVideoElement>('#hotelVideo');
    const videoOverlay = document.getElementById('videoOverlay');
    const customPlayBtn = document.getElementById('customPlayBtn');

    if (hotelVideo && videoOverlay) {
        const playVideo = async () => {
            try {
                await hotelVideo.play();
                videoOverlay.classList.add('hidden');
            } catch {
                videoOverlay.classList.remove('hidden');
            }
        };

        customPlayBtn?.addEventListener('click', playVideo);
        videoOverlay.addEventListener('click', playVideo);

        hotelVideo.addEventListener('pause', () => {
            if (!hotelVideo.seeking) {
                videoOverlay.classList.remove('hidden');
            }
        });

        hotelVideo.addEventListener('ended', () => {
            videoOverlay.classList.remove('hidden');
        });
    }

}
