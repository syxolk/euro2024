import Chart from "chart.js/auto";

type BetDistributionEntry = {
    bet: string;
    scoredCount: number;
    unscoredCount: number;
    goalDifference: number;
};

function getScoredBarColor(
    goalDifference: number,
    maxGoalDifference: number
) {
    if (maxGoalDifference <= 0) {
        return "hsla(50, 85%, 45%, 0.95)";
    }

    const minHue = 50;
    const maxHue = 220;
    const hue =
        minHue + (goalDifference / maxGoalDifference) * (maxHue - minHue);

    return `hsla(${hue}, 75%, 45%, 0.95)`;
}

function getUnscoredBarColor(
    goalDifference: number,
    maxGoalDifference: number
) {
    if (maxGoalDifference <= 0) {
        return "hsla(50, 85%, 70%, 0.75)";
    }

    const minHue = 50;
    const maxHue = 220;
    const hue =
        minHue + (goalDifference / maxGoalDifference) * (maxHue - minHue);

    return `hsla(${hue}, 75%, 70%, 0.75)`;
}

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("user-bets-chart");

    if (!(canvas instanceof HTMLCanvasElement)) {
        return;
    }

    const rawData = canvas.dataset.labels;
    if (!rawData) {
        return;
    }

    const distribution = JSON.parse(rawData) as BetDistributionEntry[];

    if (distribution.length === 0) {
        return;
    }

    const maxGoalDifference = Math.max(
        ...distribution.map((entry) => entry.goalDifference)
    );

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: distribution.map((entry) => entry.bet),
            datasets: [
                {
                    label: "Scored",
                    data: distribution.map((entry) => entry.scoredCount),
                    backgroundColor: distribution.map(function (entry) {
                        return getScoredBarColor(
                            entry.goalDifference,
                            maxGoalDifference
                        );
                    }),
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: "No points",
                    data: distribution.map((entry) => entry.unscoredCount),
                    backgroundColor: distribution.map(function (entry) {
                        return getUnscoredBarColor(
                            entry.goalDifference,
                            maxGoalDifference
                        );
                    }),
                    borderWidth: 1,
                    stack: "bets",
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            return `${context.dataset.label}: ${value}x`;
                        },
                    },
                },
            },
        },
    });
});
