

// 1.
const dataForge = require('data-forge');
require('data-forge-indicators');
require('data-forge-plot');
const moment = require('moment');
const ChartType = require('data-forge-plot').ChartType;
const AxisType = require('data-forge-plot/build/chart-def').AxisType;

/*
STUB:

async function main () {
    console.log("Hello data analysis in JavaScript");
}

main()
    .then(() => console.log("Done"))
    .catch(err => console.error(err && err.stack || err));
*/

async function main () {

    //======================-======================-======================-======================-
    // Load, parse and preview the data set.
    //======================-======================-======================-======================-

    // 2.
    let df = await dataForge.readFile("./data/Measurement-Summary-2017-12-31-to-2018-07-04.csv").parseCSV();
    df = df.parseDates("Date")
        .parseFloats("Weight")
        .setIndex("Date");

    // 3.
    console.log(df.head(10).toString());

    // 4.
    await df.plot().renderImage("./output/complete-chart-1.png");

    // 4a.
    await df.plot({}, { y: "Weight" }).renderImage("./output/complete-chart-1.png");

    //======================-======================-======================-======================-
    // Using a moving average to eliminate the noise and better see the trend.
    //======================-======================-======================-======================-

    // 5.
    const weight = df.getSeries("Weight");
    const averageWeight = weight.sma(30);

    console.log(averageWeight.head(10).toString());
    await averageWeight.plot().renderImage("./output/thirty-day-average.png");

    // 6.
    const mergedDf = df.withSeries("Average", averageWeight).skip(30);
    await mergedDf.plot({}, { x: "Date", y: "Weight" }).renderImage("./output/complete-chart-2.png");

    //======================-======================-======================-======================-
    // What is my total weight loss?
    //======================-======================-======================-======================-

    // 7a.

    const totalWeightLoss = weight.first() - weight.last();
    console.log("Total Weight Loss");
    console.log("Kgs: " + totalWeightLoss);
    console.log("%:   " + (totalWeightLoss / weight.first()) * 100);
    console.log();

    // 7b.

    console.log("Time period: ");
    const numDays = moment(weight.getIndex().last()).diff(weight.getIndex().first(), 'days');
    console.log(numDays + " days.");
    console.log();

    //======================-======================-======================-======================-
    // What is my average daily weight loss?
    //======================-======================-======================-======================-

    // 8.

    console.log("Average daily weight loss: " + (totalWeightLoss / numDays) + " kgs.");
    console.log("Average weekly weight loss: " + (totalWeightLoss / (numDays / 7)) + " kgs.");

    //======================-======================-======================-======================-
    // The actual weight loss changes. Which were the best days and weeks?
    //======================-======================-======================-======================-

    // 9.

    const weightByWeek = weight.window(7)
        .select(window => {
            return [
                window.getIndex().last(),
                window.last() - window.first()
            ];
        })
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
    console.log(weightByWeek.head(10).toString());
    await weightByWeek.plot().renderImage("./output/weekly-weight-loss-line.png");

    // 9a.
    
    await weightByWeek.plot({ chartType: ChartType.Bar }).renderImage("./output/weekly-weight-loss-bar.png");

    // 9b.

    const weightByMonth = weight.window(30)
        .select(window => {
            return [
                window.getIndex().last(),
                window.last() - window.first()
            ];
        })
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
    console.log(weightByMonth.head(10).toString());
    await weightByMonth.plot({ chartType: ChartType.Bar }).renderImage("./output/monthly-weight-loss.png");

    //======================-======================-======================-======================-
    // Group and summarize. Another way to group by month.
    //======================-======================-======================-======================-

    // 10.

    const weightGroupedByMonth = df.groupBy(row => moment(row.Date).month())
        .select(monthGroup => ({
            Month: moment(monthGroup.getIndex().first()).format("MMMM"),
            WeightChange: monthGroup.last().Weight - monthGroup.first().Weight,
        }))
        .inflate();
    console.log(weightGroupedByMonth.toString());

    await weightGroupedByMonth.plot()
        .chartType(ChartType.Bar)
        .x("Month")
        .y("WeightChange")
        .renderImage("./output/monthly-weight-loss-group-and-summarize.png");

    //======================-======================-======================-======================-
    // Daily % change. Worst day for weight loss.
    //======================-======================-======================-======================-
    
    // 11.

    const dailyChange = weight.percentChange(2);
    console.log(dailyChange.head(10).toString());

    await dailyChange.plot({ chartType: ChartType.Bar }).renderImage("./output/daily-change-bar.png");

    // 11b.
    
    df = df.withSeries("AmountChange", weight.amountChange(2));

    const daysOfWeek = df
        .groupBy(row => moment(row.Date).format('dddd'))
        .select(group => ({
            DayIndex: moment(group.first().Date).weekday(),
            Day: moment(group.first().Date).format('dddd'),
            AmountChange: group.getSeries("AmountChange")
                .where(value => typeof(value) === "number") //fio:
                .sum()
        }))
        .inflate()
        .orderBy(row => row.DayIndex)
        .bake();

    console.log(daysOfWeek.toString());
    console.log(daysOfWeek.detectTypes().toString());
    console.log(daysOfWeek.detectValues().toString());

    await daysOfWeek.plot(
            { 
                chartType: ChartType.Bar, 
            }, 
            { 
                x: "Day", 
                y: "AmountChange" 
            }
        )
        .renderImage("./days-of-week.png");

    // 12. 

    await mergedDf.plot({}, { x: "Date", y: [ "Weight", "Average" ] }).exportWeb("./output/web-export", { overwrite: true });
    

    // 13. 
    
    await mergedDf.plot({}, { x: "Date", y: [ "Weight", "Average" ] }).exportNodejs("./output/nodejs-export", { overwrite: true });
}

main()
    .then(() => console.log("Done"))
    .catch(err => console.error(err && err.stack || err));