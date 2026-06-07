(function () {
    function getConfettiShapeOptions(teamCode) {
        if (!teamCode) {
            return {
                colors: ["#ffffff", "#d4af37", "#198754"],
                shapes: ["square", "circle"],
            };
        }

        return {
            colors: ["#ffffff"],
            shapeOptions: {
                image: [
                    {
                        height: 18,
                        replaceColor: false,
                        src: "/flags/" + encodeURIComponent(teamCode.toUpperCase()),
                        width: 24,
                    },
                ],
            },
            shapes: ["image"],
        };
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function getPosition(matchCard, winnerSide) {
        const rect = matchCard.getBoundingClientRect();
        const xPx = rect.left + rect.width * (winnerSide === "home" ? 0.25 : 0.75);
        const yPx = rect.top + Math.min(rect.height * 0.35, 120);

        return {
            x: clamp((xPx / window.innerWidth) * 100, 5, 95),
            y: clamp((yPx / window.innerHeight) * 100, 5, 70),
        };
    }

    function fireConfetti(matchCard, index) {
        window.setTimeout(function () {
            if (typeof confetti !== "function") {
                return;
            }

            const winnerSide = matchCard.dataset.confettiWinnerSide;

            if (winnerSide !== "home" && winnerSide !== "away") {
                return;
            }

            const confettiShapeOptions = getConfettiShapeOptions(
                matchCard.dataset.confettiTeamCode
            );
            const position = getPosition(matchCard, winnerSide);
            const angle = winnerSide === "home" ? 60 : 120;

            confetti({
                angle: angle,
                count: 90,
                disableForReducedMotion: true,
                gravity: 1.1,
                position: position,
                scalar: 5,
                shapeOptions: confettiShapeOptions.shapeOptions,
                shapes: confettiShapeOptions.shapes,
                spread: 55,
                startVelocity: 38,
                ticks: 220,
                zIndex: 1050,
                colors: confettiShapeOptions.colors,
            });

            confetti({
                angle: angle,
                count: 50,
                disableForReducedMotion: true,
                gravity: 1,
                position: position,
                scalar: 4,
                shapeOptions: confettiShapeOptions.shapeOptions,
                shapes: confettiShapeOptions.shapes,
                spread: 90,
                startVelocity: 28,
                ticks: 180,
                zIndex: 1050,
                colors: confettiShapeOptions.colors,
            });
        }, index * 350);
    }

    document.addEventListener("DOMContentLoaded", function () {
        const unseenMatches = document.querySelectorAll("[data-confetti='true']");

        unseenMatches.forEach(function (matchCard, index) {
            fireConfetti(matchCard, index);
        });
    });
})();