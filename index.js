const dataForge = require('data-forge');
require('data-forge-indicators');
require('data-forge-plot');
const moment = require('moment');
const ChartType = require('data-forge-plot').ChartType;
const AxisType = require('data-forge-plot/build/chart-def').AxisType;

async function main () {

    //======================-======================-======================-======================-
    // Load, parse and preview the data set.
    //======================-======================-======================-======================-

    let df = await dataForge.readFile("./data/Measurement-Summary-2017-12-31-to-2018-07-04.csv").parseCSV();
    df = df.parseDates("Date")  // Parse the Date column.
        .parseFloats("Weight")  // Parse the Weight column.
        .setIndex("Date");      // Index on the Date column, for later merging data in.

    console.log(df.head(10).toString()); // Preview the data, check that it was loaded and parsed ok.

    await df.plot().renderImage("./output/complete-chart-1.png"); // Render first chart.

    await df.plot({}, { y: "Weight" }).renderImage("./output/complete-chart-2.png"); // Make the chart look ok visually, render again.

    await df.plot({}, { y: "Weight" }).exportWeb("./output/web-export-1"); // Export an interactive web viz.

    await df.plot({}, { y: "Weight" }).exportNodejs("./output/nodejs-export-1"); // Export a Node.js project.

    //======================-======================-======================-======================-
    // What are the best and worst days of the week for weight gain/loss?
    //======================-======================-======================-======================-
    
    const weight = df.getSeries("Weight");              // Extract the weight column.
    const amountChange = weight.amountChange(2);        // Compute the amount of day-to-day weight loss/gain.
    df = df.withSeries("AmountChange", amountChange);   // Merge computed data back into our data set.

    const daysOfWeek = df
        .groupBy(row => moment(row.Date).format('dddd'))        // Group the data set by day of week.
        .select(group => ({                                     // Transform each group to a summary of the group.
            DayIndex: moment(group.first().Date).weekday(), 
            Day: moment(group.first().Date).format('dddd'),
            AmountChange: group.getSeries("AmountChange")       // Average amount of weight change for the particular day.
                .where(value => typeof(value) === "number")
                .average()
        }))
        .inflate()
        .orderBy(row => row.DayIndex);                          // Make sure the data is sorted in the right order for display in the chart.

    console.log(daysOfWeek.toString()); // Preview our data before we produce the chart.
    console.log(daysOfWeek.detectTypes().toString());
    console.log(daysOfWeek.detectValues().toString());

    await daysOfWeek.plot(
            { 
                chartType: ChartType.Bar,   // Plot a bar chart.
            }, 
            { 
                x: "Day",                   // Assign the Day column to the chart's X axis.
                y: "AmountChange"           // Assign the AmountChange column to the Y axis.
            }
        )
        .renderImage("./output/days-of-week.png");

    //======================-======================-======================-======================-
    // Understand the daily change as a percentage.
    //======================-======================-======================-======================-
    
    const dailyChange = weight.percentChange(2); // Look at day-to-day percentage change.
    console.log(dailyChange.head(10).toString());
    await dailyChange.plot({ chartType: ChartType.Bar }).renderImage("./output/daily-change-bar.png");
    

    //======================-======================-======================-======================-
    // Using a moving average to eliminate the noise and better see the trend.
    //======================-======================-======================-======================-

    const averageWeight = weight.sma(30); // Produce a 30-day simple moving average (sma) - also known as a rolling average.

    console.log(averageWeight.head(10).toString());
    await averageWeight.plot().renderImage("./output/thirty-day-average.png");

    const mergedDf = df.withSeries("Average", averageWeight).skip(30); // Merge the SMA into our data set.
    await mergedDf.plot({}, { x: "Date", y: ["Weight", "Average"] }).renderImage("./output/complete-chart-3.png"); // Render merged series.

    //======================-======================-======================-======================-
    // What is my total weight loss?
    //======================-======================-======================-======================-

    const totalWeightLoss = weight.first() - weight.last();
    console.log("Total Weight Loss");
    console.log("Kgs: " + totalWeightLoss);
    console.log("%:   " + (totalWeightLoss / weight.first()) * 100);
    console.log();

    console.log("Time period: ");
    const numDays = moment(weight.getIndex().last()).diff(weight.getIndex().first(), 'days');
    console.log(numDays + " days.");
    console.log();

    //======================-======================-======================-======================-
    // What is my average daily weight loss?
    //======================-======================-======================-======================-

    console.log("Average daily weight loss: " + (totalWeightLoss / numDays) + " kgs.");
    console.log("Average weekly weight loss: " + (totalWeightLoss / (numDays / 7)) + " kgs.");

    //======================-======================-======================-======================-
    // Which were the best days and weeks for weight loss?
    //======================-======================-======================-======================-

    const weightByWeek = weight.window(7) // Analyse the data in 7-day windows.
        .select(window => {
            return [
                window.getIndex().last(),
                window.last() - window.first()
            ];
        })
        .withIndex(pair => pair[0])
        .select(pair => pair[1]);
    console.log(weightByWeek.head(10).toString());
    await weightByWeek.plot({ chartType: ChartType.Bar }).renderImage("./output/weekly-weight-loss-bar.png");

    const weightByMonth = weight.window(30) // Analyse the data in 30-day windows.
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

    const weightGroupedByMonth = df.groupBy(row => moment(row.Date).month()) // Group the data by month.
        .select(monthGroup => ({ // Transform each group to a summary of the weight change per month.
            Month: moment(monthGroup.getIndex().first()).format("MMMM"),
            WeightChange: monthGroup.last().Weight - monthGroup.first().Weight,
        }))
        .inflate();
    console.log(weightGroupedByMonth.toString());

    await weightGroupedByMonth.plot()
        .chartType(ChartType.Bar) // This is an example of the Data-Forge Plot fluent API.
        .x("Month")
        .y("WeightChange")
        .renderImage("./output/monthly-weight-loss-group-and-summarize.png");
}

main()
    .then(() => console.log("Done"))
    .catch(err => console.error(err && err.stack || err));