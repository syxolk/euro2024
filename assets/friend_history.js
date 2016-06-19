$(function() {
    function integrateScores(scores) {
        var currSum = 0;
        return scores.map(function(x) {
            currSum += x;
            return currSum;
        });
    }

    // check if there is a friend history canvas (only on friends highscore)
    if($('#friend-history').length === 0) {
        return;
    }

    $.get('/friend_history').done(function(result) {
        if(! result.ok) {
            console.error(result);
            return;
        }

        new Chart($('#friend-history'), {
            type: 'line',
            data: {
                labels: result.labels,
                datasets: result.data.map(function(user, index) {
                    return {
                        label: user.name,
                        lineTension: 0,
                        borderColor: 'hsl(' + (index * 360.0 / result.data.length) + ',100%,50%)',
                        fill: false,
                        data: integrateScores(user.scores)
                    };
                })
            },
            options: {
                maintainAspectRatio: true,
                scales: {
                    yAxes: [{
                        ticks: {
                            min: 0
                        }
                    }]
                }
            }
        });
    });
});
