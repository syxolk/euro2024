$(function() {
    // check if there is a canvas (only on user page)
    if($('#history').length === 0) {
        return;
    }

    $.get(location.pathname + '/history').done(function(result) {
        if(! result.ok) {
            console.error(result);
            return;
        }

        var datasets = [{
            // 1 point
            label: '\u2605\u2605\u2606\u2606',
            backgroundColor: '#ccffcc'
        }, {
            // 2 points
            label: '\u2605\u2605\u2605\u2606',
            backgroundColor: '#00e600'
        }, {
            // 3 points
            label: '\u2605\u2605\u2605\u2605',
            backgroundColor: '#009900'
        }];
        datasets = datasets.map(function(set) {
            // options for all datasets
            set.fill = true;
            set.lineTension = 0;
            set.data = [];
            return set;
        });

        // Compute the sums of each score type (1/2/3)
        var counts = [0, 0, 0];
        result.data.forEach(function(x) {
            counts[x - 1] += x;
            counts.forEach(function(c, index) {
                datasets[index].data.push(c);
            });
        });

        new Chart($('#history'), {
            type: 'line',
            data: {
                labels: result.labels,
                datasets: datasets
            },
            options: {
                maintainAspectRatio: true,
                scales: {
                    yAxes: [{
                        stacked: true,
                        ticks: {
                            min: 0,
                            maxTicksLimit: 10
                        }
                    }],
                },
                legend: {
                    onClick: function() {},
                    labels: {
                        fontFamily: 'FontAwesome'
                    }
                },
                tooltips: {
                    bodyFontFamily: 'FontAwesome'
                }
            }
        });
    });
});
