import Swiper from 'swiper';

const swiper = new Swiper('.cards-js', {
  enabled: false, // по умолчанию список (мобилка)


  breakpoints: {
    413: {
      enabled: true,          // включаем слайдер
      slidesPerView: 'auto',
      spaceBetween: 16,
    }
  },
});




const reverce = new Swiper('.cards-reverse-js', {
 
  breakpoints: {
    0: {
      slidesPerView: 1,
      spaceBetween: 16,
    },
    413: {
      slidesPerView: 'auto',
      spaceBetween: 16,
    },
    992: {
      enabled: false,
      spaceBetween: 16,
    }
  },

});
