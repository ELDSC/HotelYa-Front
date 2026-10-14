import '../styles/main.css';
import '../styles/hotel-central.css';
import { initHeader } from '../ui/header';
import { initAuthHeader } from '../features/auth';
import { initHotelDetail } from '../features/hotel-detail';
initHeader();
void initAuthHeader();
initHotelDetail();
