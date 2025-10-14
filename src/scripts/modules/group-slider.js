import Swiper from 'swiper';
import { Grid } from 'swiper/modules';

const swiper = new Swiper('.slider-group-js', {
  slidesPerView: 'auto',
  modules: [Grid],
  grid: {
    rows: 2,
    fill: "row",
  },
  spaceBetween: 13,

  breakpoints: {
    480: {
      slidesPerView: 'auto',
      grid: { rows: 1, fill: 'row' },
      spaceBetween: 13
    }
  }
});




