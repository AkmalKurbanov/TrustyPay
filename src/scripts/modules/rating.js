document.addEventListener('DOMContentLoaded', function() {
            const ratings = document.querySelectorAll('.rating');
            
            ratings.forEach(ratingElement => {
                const ratingValue = parseFloat(ratingElement.getAttribute('data-rating'));
                
                if (!isNaN(ratingValue)) {
                    renderRating(ratingElement, ratingValue);
                }
            });
            
            function renderRating(container, rating) {
                const maxStars = 5;
                const starPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
                
                for (let i = 1; i <= maxStars; i++) {
                    const starItem = document.createElement('div');
                    starItem.className = 'rating__item';
                    
                    let fillPercentage = 0;
                    
                    if (rating >= i) {
                        fillPercentage = 100; // Полная звезда
                    } else if (rating > i - 1) {
                        fillPercentage = 50; // Половина звезды
                    }
                    
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    
                    // Фон звезды (серая)
                    const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    bgPath.setAttribute('d', starPath);
                    bgPath.classList.add('rating__star-bg');
                    
                    // Заливка звезды (желтая)
                    const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    fillPath.setAttribute('d', starPath);
                    fillPath.classList.add('rating__star-fill');
                    
                    if (fillPercentage === 50) {
                        // Для половины звезды используем clipPath
                        const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                        clipPath.id = `clip-half-${Date.now()}-${i}`;
                        
                        const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        clipRect.setAttribute('x', '0');
                        clipRect.setAttribute('y', '0');
                        clipRect.setAttribute('width', '12');
                        clipRect.setAttribute('height', '24');
                        
                        clipPath.appendChild(clipRect);
                        svg.appendChild(clipPath);
                        
                        fillPath.setAttribute('clip-path', `url(#${clipPath.id})`);
                    } else if (fillPercentage === 0) {
                        fillPath.style.display = 'none';
                    }
                    
                    svg.appendChild(bgPath);
                    svg.appendChild(fillPath);
                    starItem.appendChild(svg);
                    container.appendChild(starItem);
                }
            }
        });