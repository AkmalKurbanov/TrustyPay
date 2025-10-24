import Swiper from 'swiper';
import { Autoplay } from 'swiper/modules';
const swiper = new Swiper('.cards-js', {
  enabled: false, // по умолчанию список (мобилка)
  modules: [Autoplay],
  speed: 2000,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },

  breakpoints: {
    // 0: {
    //   slidesPerView: 1.1,
    //   spaceBetween: 16,
    // },
    413: {
      enabled: true,          // включаем слайдер
      slidesPerView: 'auto',
      spaceBetween: 16
    }
  },
});




const reverce = new Swiper('.cards-reverse-js', {
  modules: [Autoplay],
  speed: 2000,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  breakpoints: {
    0: {
      slidesPerView: 1.1,
      spaceBetween: 16,
    },
    412: {
      slidesPerView: 'auto',
      spaceBetween: 16,
    },
    992: {
      enabled: false,
      spaceBetween: 16,
    }
  },

});
