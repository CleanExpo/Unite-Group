---
title: "Which Machine Learning Models Predict Stock Trends the Best"
source: "https://www.youtube.com/watch?v=TM8sz9cKJ2g"
author:
  - "[[Analytics in Practice]]"
channel: "Analytics in Practice"
published: 2026-05-08
created: 2026-05-08
description: "This project builds a full end-to-end machine learning trading system to analyze and predict stock market trends using historical data. It begins by downloading market data and engineering features su"
tags:
  - "clippings"
---
![](https://www.youtube.com/watch?v=TM8sz9cKJ2g)

This project builds a full end-to-end machine learning trading system to analyze and predict stock market trends using historical data. It begins by downloading market data and engineering features such as moving averages, volatility, momentum, and lagged returns to capture patterns in price behavior. The system then trains three different models—Random Forest, XGBoost, and LSTM—to predict whether the stock will move up or down the next day. These predictions are converted into trading signals, which determine whether to hold the stock or stay in cash. A backtesting framework is used to simulate how each strategy would have performed over time compared to a buy-and-hold approach. Key performance metrics such as total return, annualized return, volatility, Sharpe ratio, maximum drawdown, and win rate are calculated to evaluate each model. The results show that while machine learning models can capture some patterns, they do not always outperform a simple buy-and-hold strategy. Transaction costs are incorporated to make the simulation more realistic, revealing that frequent trading can significantly reduce performance. Feature importance analysis highlights which variables, such as momentum and lagged returns, contribute most to model predictions. Overall, the project demonstrates both the potential and limitations of applying machine learning to financial markets, emphasizing that strong risk management and proper validation are just as important as model accuracy.

## Transcript

**0:02** · Cell one. In this first cell, we're setting the stage for a comprehensive exploration of market data and trading strategies. This is crucial for understanding how to develop a robust framework for predicting stock trends and making informed trading decisions.

**0:18** · The cell outlines the various steps we'll be undertaking from downloading market data to engineering features that will help train models. We start by gathering historical market data which forms the foundation of our analysis. We will engineer trading features that will serve as inputs for our models. These features may include metrics such as moving averages, volatility indicators, and other technical indicators that can provide insights into market behavior.

**0:43** · Once the features are ready, we'll train three different types of models to predict the direction of the market for the next day. This is where the real potential lies as our predictions will ultimately guide our trading signals. As we progress, it's important to remember that the aim is not just to achieve a high accuracy rate. Many beginners fall into this trap, assuming that a model with even modestly higher accuracy will be successful. However, a model with 52% accuracy may still generate profits if riskmanagement practices are effectively implemented.

**1:13** · Conversely, a model boasting 60% accuracy could lead to losses if trade sizes are mismanaged. In this context, we'll also look into back testing our strategies against a simple buy and hold approach and measure performance using metrics like the sharp ratio and draw down. These metrics will help us evaluate not just the profitability but also the risk associated with our strategies. We will take into account real world complexities such as transaction costs and slippage as well as the importance of diversifying our risk through effective position sizing and adhering to risk limits.

**1:44** · By the end of our analysis, we'll also delve into feature importance, allowing us to see which indicators had the greatest impact on our predictive power.

**1:52** · This holistic approach ensures that we build a well-rounded trading strategy.

**1:57** · As we move into the next cell, we'll begin the exciting process of downloading the necessary market data, setting us up for the subsequent modeling and analysis. Cell two. In this cell, we're setting the stage for a data analysis workflow by importing a range of essential libraries and loading historical stock data for Apple identified by the ticker symbol AAPL.

**2:18** · This step is crucial as it establishes the foundational data that we will use for further analysis and modeling.

**2:25** · First, we utilize the Y Finance library to download stock price history starting from January 1st, 2015. This historical data is invaluable for understanding trends and patterns in Apple's stock performance over time. By specifying that we want to focus on key columns, open, high, low, close, and volume, we're filtering the data set to only include the information that's necessary for our analysis.

**2:48** · It's also worth noting that we handle any missing values by removing those rows, ensuring that our data set remains robust and clean for further steps. The display settings adjusted for pandas will ensure that when we eventually output data, we'll see all rows and columns without truncation. This is especially helpful when analyzing large data sets as it helps prevent any critical information from being overlooked.

**3:11** · Additionally, the imports from various machine learning libraries position us to use advanced techniques like random forest and XG boost classifiers along with neural networks for time series prediction.

**3:24** · These models will leverage the historical data we just downloaded to make informed predictions about future stock performance. Another important aspect of this setup is the inclusion of warning suppression, which helps streamline our output by preventing unnecessary messages from cluttering the results. As we move forward to the next cell, we will likely dive deeper into pre-processing the data and implementing models. This will build upon the groundwork laid here where we'll focus more on feature engineering and potentially start analyzing how these features correlate with stock price movements. Cell three.

**3:55** · In this cell, we're enhancing our data frame by calculating several key financial metrics that provide insights into the stock's behavior. This involves determining returns, moving averages, volatility, momentum, and changes in volume. All of which are essential for analyzing trends and predicting future performance. To start, we calculate the daily returns by taking the percentage change of the closing prices. This helps us understand how much the price has fluctuated from one day to the next.

**4:24** · Following that, we introduce moving averages over different periods, 5, 20, and 50 days, offering a smoother view of the price trends and helping to identify potential support or resistance levels.

**4:36** · Volatility is next on our list, measured by the standard deviation of returns over 10 and 20 days. This indicates how wildly the price has been swinging, which is critical for risk assessment.

**4:46** · Then we shift our focus to momentum. We assess how the closing price has performed over the last 5, 10, and 20 days, which provides a clear understanding of momentum trends by comparing past prices to the current price. Additionally, we examine the change in trading volume which can indicate increasing or decreasing interest in a stock. We're also creating lagged return variables, first, second, and third lags that allow us to see how past returns can influence current decision-m.

**5:12** · Furthermore, we create a future return variable establishing a target that we convert to a binary outcome indicating whether the future return will be positive. Importantly, we ensure our data frame remains clean by dropping any rows with missing values, allowing our subsequent analyses to run smoothly without encountering errors. By the time we conclude this cell, the dataf frame not only provides a comprehensive overview of key metrics, but also sets up a robust foundation for further analysis.

**5:39** · In the next cell, we will likely explore how these metrics can be leveraged for predictive modeling or deeper statistical analysis, paving the way for datadriven decision-making in our financial strategies. Cell four.

**5:52** · In this code cell, we are preparing our data set for analysis by selecting specific features and splitting the data into training and testing sets. This is a crucial step in building a robust machine learning model as it ensures that we can evaluate our model's performance on data it hasn't seen before. We begin by defining a list of features that we believe will be important for our model. These features include various moving averages, volatility measures, momentum indicators, volume change, and lagged values.

**6:20** · Each of these features captures different aspects of the data, allowing our model to gain insights into market trends and behaviors. After establishing these features, we create our input variable X by filtering our data frame DF to include only these selected features. The target variable Y is defined as the column representing the outcome we aim to predict. Next, we prepare to split our data set into training and testing sets. We calculate the index for the split at 75% of the total length of the data frame.

**6:51** · This is an important fraction ensuring that we have a substantial amount of data for training while still reserving a good portion for testing. Once we have the index, we slice our features and target variable accordingly to create X-rain and X test as well as Y train and Y test. Additionally, we create a test data frame test DF which holds the data that will be used for evaluation. To enhance the effectiveness of our model, we standardize our feature set using the standard scaler.

**7:19** · This tool adjusts the scale of the features so that they all contribute equally to the model's predictions. First, we fit the scaler on the training data and then apply the transformation to both the training and test sets. It's important to note that we do not fit the scaler on the test set to avoid data leakage which could lead to overly optimistic performance results. As we move forward, these prepared data sets will serve as the foundation for training our model.

**7:44** · In the next cell, we can expect to see how we utilize this data to train a machine learning model, optimizing it based on the features we selected and the target variable we defined. This is where the magic of predictive modeling truly begins. Cell five. In this cell, we're building and evaluating a random forest model, which is a powerful ensemble learning technique often used for classification tasks. This is important because it helps us predict outcomes based on complex data sets while handling various features effectively.

**8:16** · First, we initialize the random forest classifier with specific parameters. By choosing 300 as the number of estimators, we're essentially allowing the model to leverage a collection of decision trees, which increases its ability to generalize over the test data set. The maximum depth of five constrains these trees, preventing them from becoming overly complex and reducing the risk of overfitting to the training data. We've also set a random state to ensure that our results will be reproducible, which is a critical aspect of reliable modeling. Next, we fit the model to our training data.

**8:47** · Here the model learns the relationships between the features in X train and the corresponding labels in Y train. This is a crucial step as it allows the model to identify patterns that will be useful when it encounters new data. After the model has been trained, we move on to making predictions on our test data set X test. This is where the model's power is put to the test as it tries to correctly classify the inputs it hasn't seen before. We also calculate the predicted probabilities for each class, focusing primarily on the positive class.

**9:18** · Understanding these probabilities gives us more insight into how confident the model is about its predictions, which can be particularly useful in scenarios where the cost of incorrect predictions varies. To make evaluation straightforward, we create a new data frame that combines our test inputs with actual outcomes and the model's predictions. This allows us to clearly see how well the model performed. The accuracy score provides a single measure of performance. Closer to one indicates a better fit, meaning the model is correctly identifying the classes more often than not.

**9:49** · As we move forward, the next cell will likely delve deeper into evaluating model performance, possibly covering metrics beyond accuracy to give us a fuller picture of how the random forest is functioning. This will enhance our understanding even further as we refine our analysis. Cell six. In this code cell, we're diving into the power of the XG boost algorithm, specifically with an XGB classifier implementation.

**10:16** · This model is widely used in machine learning due to its speed and performance, especially for classification tasks, and understanding its setup is crucial for leveraging its strengths. We begin by initializing our XGB classifier where several important parameters are specified.

**10:33** · The number of estimators is set to 300, which means the model will build up to 300 trees to make predictions. The maximum depth of these trees is limited to five, helping to prevent overfitting while still capturing essential patterns in the data. The learning rate is intentionally kept low at 0.05, striking a balance between learning effectiveness and stability during training.

**10:57** · Additionally, the subsample and coal sample by tree fractions, both set to 0.8, 8 indicate that we're using 80% of the data and features available for training which further helps in generalizing the model rather than fitting it too closely to the training data. Once the model is initialized, we fit it to our training data set X train and Y train. This step crucially allows the model to learn the relationships within the data. Following the training process, we then make predictions on the heldout test data X test.

**11:25** · These predictions will help us understand how well our model is performing. We also obtain probabilities for the predictions, emphasizing the confidence levels of the model's outputs.

**11:37** · The testdf variable is used to organize our results, combining the actual outcomes from y test with the model's predictions and the associated probabilities. This allows us to have a straightforward comparison in a structured format.

**11:51** · Finally, we calculate and print the accuracy of our model using the accuracy score function. It's important to note that while accuracy is a valuable metric, it may not always provide a complete picture, especially with imbalanced data sets. As we move forward, we will likely explore how these predictions can be refined.

**12:09** · Further analysis or model evaluation techniques will help us understand the impact of the configurations we've set and possibly tune them for better performance. Cell seven. In this cell, we're delving into the powerful capabilities of long short-term memory networks or LSTMs, which are particularly well suited for working with sequential data. Traditional models often struggle with such data, but LSTMs can capture long range dependencies, making them invaluable for tasks like time series prediction or natural language processing.

**12:39** · Here we start by defining a function called create sequences, which transforms our data into the required format for the LSTM model. By taking the look back parameter set to 30 in this case, the function generates overlapping sequences of data where each sequence contains the past 30 data points. This is crucial because LSTMs need contextual information from previous values to make accurate predictions. The function also prepares the target outputs by aligning them with the last value of each sequence.

**13:08** · Once we create these sequences for both our training and testing data, we move into constructing the LSTM model itself. The architecture begins with an LSTM layer that has 64 units followed by a dropout layer to help mitigate overfitting. Then we see a second LSTM layer with 32 units again followed by dropout for regularization.

**13:31** · The model concludes with a dense layer that outputs a single value using a sigmoid activation tailoring the output for binary classification.

**13:39** · Next, we compile the model using the atom optimizer and binary cross entropy as the loss function, making it suitable for our classification task. We then fit the model to our training sequences, utilizing a validation split to monitor performance during training. It runs for 10 epochs with a batch size of 32, which balances the training speed and the model's ability to generalize.

**14:01** · After training the model, we predict probabilities on the test sequence and convert those probabilities into binary predictions, marking them as either zero or one based on a threshold of 0.5. We also align these predictions with the relevant indices in our original data frame.

**14:17** · Finally, we calculate and print the model's accuracy, giving us a clear measure of how well our LSTM is performing. Looking ahead to the next cell, we'll likely explore the implications of the model's predictions, possibly analyzing its performance further or visualizing the results to gain deeper insights into the model's effectiveness. This journey into LSTMs not only enriches our understanding of sequential data, but also sets the stage for more advanced applications.

**14:42** · Cell 8. In this cell, we focus on transforming the predictions from our machine learning models into actionable trading signals. This is vital for evaluating how well our models can guide trading decisions, ultimately affecting portfolio performance. First, we rebuild the test DF, ensuring it retains the same structure while including predictions from various models. This includes our random forest, XG Boost, and long short-term memory networks.

**15:06** · For each model, we not only get the binary prediction indicating whether to buy or sell, but also the associated probabilities that measure the model's confidence in those predictions. As we handle the LSTM, it's important to note that its predictions start after a specific look back period, ensuring we account for the necessary past data before making forecasts. Moving along, we generate trading signals directly from these predictions. For instance, the signals indicate whether to enter a trade based on the model's advice from the previous time step.

**15:35** · To gauge the performance of each strategy, we calculate the strategy returns by shifting the signals one position forward, which simulates a realistic trading scenario where you only act on past information. In addition to the modelbased strategies, we create a buy and hold return for comparison purposes.

**15:53** · After filling in any missing values, we compute the cumulative returns for each strategy and the buy and hold approach, which provides a clearer picture of performance over time.

**16:03** · Finally, by displaying the initial rows of this enriched data frame, we can inspect the combined effects of our models on simulated trading outcomes.

**16:11** · Looking ahead, the next cell will likely delve into visualizing these performance metrics, allowing us to interpret and compare the effectiveness of each strategy more intuitively. Cell 9. In this cell, we're looking at performance metrics that allow us to evaluate different trading strategies. This is crucial because understanding how strategies compare not only helps in selecting the best option but also in refining our approaches for future investments. The first function called sharp ratio calculates a key financial measurement that assesses strategy performance by adjusting for risk.

**16:41** · It does this by taking the mean of the returns and dividing it by their standard deviation. Thus capturing the relationship between risk and return over a specified number of periods in a year. This ratio gives us a clearer picture of how much return is generated per unit of risk. Next, we have the max draw down function, which measures the largest drop from a peak to a trough in the equity curve. It's essential for understanding the potential downside that an investor might face during a strategy's worst performance period.

**17:10** · By tracking how far equity falls from its max, we can better prepare ourselves for possible losses.

**17:18** · The performance summary function plays a pivotal role by aggregating various metrics for each strategy like total return, annualized return, annualized volatility, sharp ratio, max draw down, and win rate into a clear and concise format. Each of these metrics sheds light on different aspects of a strategy's risk return profile. For instance, a high sharp ratio indicates a favorable risk adjusted return while a low max draw down suggests better capital preservation during downtrends.

**17:46** · Finally, we compile all this information into a data frame which encompasses the performance of multiple strategies, including random forest, XG boost, LSTM, and a simple buy and hold approach. Each of these strategies is evaluated side by side, which makes comparisons straightforward and informative. As we analyze this output, we'll gain insights on how different methodologies perform under similar market conditions.

**18:07** · Looking ahead, the subsequent cell is expected to delve deeper into interpreting these results and potentially guiding our next steps in strategy optimization or selection. Cell 10. In this cell, we're focusing on visualizing the performance of different machine learning trading strategies through equity curves using plotly. This is crucial because it provides a clear comparison of how various models stack up against a simple buy and hold approach, helping us to evaluate their effectiveness over time.

**18:38** · The workflow begins by creating a figure object which serves as our canvas for the visualizations. We then add multiple traces to this figure, each representing the growth of a dollar investment over time for different strategies.

**18:51** · For instance, we have traces for random forest, XG boost, and LSTM models as well as a baseline buy and hold strategy. By plotting their respective equity curves against the same index, essentially the dates of our back test, we can visually assess how each model performs over the same period. In terms of important variables, each strategy's equity values are sourced from the test DF, which contains the historical performance data.

**19:15** · The x-axis displays the dates, while the y-axis depicts the growth of $1 invested, making it easy to interpret how well each strategy has done in comparison to the others. One notable observation to make is that the LSTM model's trading pattern closely aligns with the buy and hold strategy.

**19:33** · This might suggest that the LSTM model has learned to remain invested most of the time, leading to results that do not stray far from simply holding on to the asset. It's key to be aware that while the visualizations provide insights, they can also mask certain nuances. For example, the LSTM model's similarity to the buy and hold strategy might imply that it lacks a distinct advantage over this simpler approach.

**19:56** · This comparison helps us highlight both the strengths and potential shortcomings of using advanced models in certain trading situations. As we move forward, the next cell is likely to delve deeper into analyzing these results quantitatively, potentially incorporating metrics to evaluate the performance further. This will aid in understanding the practical implications of using these models in real world trading scenarios. Cell 11. In this cell, we're focusing on visualizing the draw downs from different trading strategies, which is vital for understanding the risk associated with each approach.

**20:26** · By plotting these drawdowns, we can assess how each strategy performs under adverse conditions, giving us insights into their overall robustness and volatility.

**20:36** · To start, we define a function that calculates the draw down series from a given equity curve. This function identifies the rolling maximum of the equity values over time and then computes the draw down by comparing the current value to that maximum. As we progress, we create a figure using plotly a popular library for interactive visualizations where we add different traces for each strategy including random forest XG boost and LSTM models as well as a traditional buy and hold strategy.

**21:03** · In terms of the visual output, we expect to see the draw downs plotted against their respective dates on the x-axis. Each line will show how much each strategy has fallen from its peak, which allows us to visually compare their maximum draw downs and determine how quickly each strategy rebounds after those drops. It's essential to note that this function assumes that the input equity curves are structured correctly and contain no missing values.

**21:27** · Otherwise, it could lead to misleading results. As we look at the resulting graph, we can begin to derive conclusions about the effectiveness and risk profiles of these strategies.

**21:36** · Spotting patterns in the draw downs can guide us in further refining our approaches either by enhancing certain strategies or even by combining different methods to minimize risk.

**21:46** · Looking forward, the next cell is likely to delve into further analyzing these drawdowns, perhaps exploring metrics like recovery time or maximum draw down values to quantify the risks more explicitly. This will help solidify our understanding of each strategy's performance under pressure. Cell 12. In this cell, we're focusing on incorporating transaction costs into our model's performance evaluations. This is a crucial step as it adds realism to our strategies by accounting for the real world expenses incurred when trading.

**22:16** · First, we set a transaction cost rate, which here is a modest 0.1%.

**22:22** · This figure is applied as we calculate the effects on the model signals. So for each model, namely random forest, XG Boost, and LSTM, we examine the trading decisions made and how they influence overall returns after costs are factored in. We start by recording the absolute difference in trading signals to gauge how many trades occur, storing this in a new column for each model. Next, we adjust the strategy returns to account for these transaction costs. This is done by subtracting the product of the number of trades and the transaction cost from the initial strategy returns.

**22:57** · The intention here is to create a more realistic picture of how each strategy would perform in a trading environment where costs are unavoidable.

**23:04** · Then we calculate the cumulative returns which gives us the equity curve for each model after adjusting for transaction costs. This step lets us see how the strategies would grow over time properly reflecting the reductions due to trading expenses.

**23:19** · Moving forward, we gather performance metrics into a structured data frame.

**23:23** · Here, we compare the results for each machine learning model alongside a simple buy and hold strategy. This comparison is crucial as it allows us to evaluate the effectiveness of our models against a more passive investment approach. As we analyze these results, we must be mindful of the assumptions we've made about transaction costs and trading behavior. Any miscalculation can significantly skew the perceived performance of the strategies.

**23:49** · The next cell will likely delve deeper into these performance metrics, offering further insights into which strategy might be most robust in a real trading scenario. Cell 13. In this cell, we're diving into the trade bladder to examine how different models, specifically LSTM, random forest, or XG boost, are predicting buy, sell, or hold actions.

**24:09** · This is crucial for understanding the practical implications of our models and evaluating their real world performance.

**24:15** · Starting with a defined strategy, we specify which model signals we're analyzing. We've set an initial capital for our trades, which acts as a foundation for calculating portfolio values throughout our analysis. By duplicating the original test data frame, we can keep track of the signals and actions without altering the original data set. We then create new columns that help us interpret trades.

**24:37** · First, we look back at the previous signal to determine what has changed.

**24:41** · This allows us to see if our model is indicating a new action. If there's a shift from hold to buy or sell, this signals a trade. We also categorize each trade into three actions, buy, sell, or hold, depending on the calculated differences. Next, we compute the portfolio value based on the selected model signals. This is done by multiplying the starting capital by the corresponding equity values for each signal. Following that, we assess the dollar amount involved in each trade. If a buy or sell action occurs, we equate that to the current portfolio value.

**25:12** · Otherwise, we note it as zero. to focus on meaningful transactions. We filter the data set down to just those rows where a buy or sell action took place.

**25:21** · This cleaned up trade plotter not only includes our action types, but also displays the dollar amounts traded, the overall portfolio value, and the returns generated from these decisions. The final step involves formatting these values for better readability, presenting them in a way that's easily interpretable. As we conclude this cell, it sets the stage for the next one where we will likely analyze performance metrics related to these trades or visualize the results for better insights on our trading strategies. Cell 14.

**25:47** · In this cell, we're refining our data set by creating a new variable called daily blott, which narrows down to specific columns of interest from the original blotter. This helps us focus on the most relevant data for our analysis, allowing us to track actions, trade dollars, portfolio value, signals, and returns in a more concise format. The construction of this new variable entails selecting key columns that provide insights into our trading activities.

**26:12** · The columns we've chosen, action, trade dollars, portfolio value, a designated signal column, and return offer a holistic view of our trading strategy. By doing this, we prepare ourselves for a more focused analysis of individual trades, revealing how each action impacts our trade dollars and portfolio value. After setting up the daily bladder, the code includes a step to print out the distribution of actions taken from the original blotter.

**26:37** · This gives us valuable context regarding how many times each action was executed, which is vital for understanding our trading behavior. Observing these counts can help us identify patterns or anomalies in our trading strategy, such as whether we favor buying or selling more frequently. Once we've gathered the counts of actions, we also display the first 100 rows of the daily blotter.

**27:00** · This allows for a quick glance at the data structure and a deeper understanding of how trades were structured and their corresponding returns. It's important to keep in mind that we're assuming our bladder was correctly populated and structured prior to this operation. Any discrepancies in the data at an earlier stage could lead to misleading interpretations here.

**27:19** · Moving forward in the next cell, we will likely delve even deeper into the analysis of this daily blotter. Expect to see functions that evaluate trading performance or perhaps visualize trends that arise from the data we've met prepared in this step. This will set the stage for informed decision-making as we continue to navigate through our trading strategy. Cell 15. In this cell, we're diving into the concept of feature importance, which plays a crucial role in understanding how different variables contribute to the predictions made by our model.

**27:49** · By analyzing feature importance, we gain insights that can guide further improvements to our model and inform decision-m. Here, we start by creating a data frame that neatly organizes our features alongside their associated important scores derived from the random forest model we've built. The important scores indicate how much each feature contributes to the model's predictive power. To facilitate a more insightful analysis, we sort this data frame in descending order, allowing us to quickly identify which features are the most influential.

**28:20** · Key variables in this process include the list of features we've been working with, as well as the importance metrics generated by the random forest model. By utilizing these two components, we're essentially measuring the impact of each feature on the overall performance of our predictive model. This visualization helps us pinpoint the strengths and weaknesses in our data set and could guide us in feature selection or engineering.

**28:44** · If we notice that certain features are significantly underperforming, as we look to the output of this cell, we expect to see a clear ranking of the features based on their importance. This could reveal interesting relationships and potentially highlight features we might want to further investigate or refine. One thing to be cautious about is the potential for biased important scores due to correlations between features which could mislead our interpretation.

**29:10** · In the next cell, we will likely explore how to leverage this feature importance analysis to make informed decisions about refining our predictive model or even reducing dimensionality.

**29:22** · Understanding which features matter most can significantly influence the strategies we employ in future steps of our analysis. Cell 16. In this cell, we create a visual representation of feature importance derived from a random forest model, which is crucial for understanding which variables contribute the most to predictions. Visualizations like this help communicate complex information in an intuitive format, allowing us to quickly assess the significance of each feature involved in our model.

**29:49** · To achieve this, we begin by initializing a new figure using plotly functionality, which is an incredibly powerful library for creating interactive visualizations. We then add a bar trace to the figure, specifying our x-axis as the features from the data set and the y-axis as their respective important scores. By using a color scale ranging from red to blue, we can visually emphasize the varying levels of importance, where colors can often enhance intuition about data.

**30:15** · The layout of the figure is updated next, giving it a clear title and labeling the axes appropriately. The title random forest feature importance succinctly describes what the viewer is looking at, while the x-axis indicates the features and the y-axis represents their important scores. We've also specified dimensions for the figure, ensuring that it's wide enough to comfortably display all features and their significance without overcrowding.

**30:40** · One consideration here is ensuring that the values in RF importance are correctly ordered and make logical sense as an incorrect ordering will lead to misinterpretations in the resulting visualization.

**30:52** · Furthermore, learners should be cautious about the inherent biases that could arise from how features are selected for modeling as this can influence the perceived importance. By the end of this cell, we expect an interactive bar chart that will allow us to dive deeper into the characteristics driving our predictions. In the next cell, we can build upon this visual analysis by exploring how these feature importances might affect model tuning or validation processes. This connection will help solidify our understanding of feature significance in the context of the broader modeling pipeline. Cell 17.

**31:21** · In this cell, we're diving into the feature importance as derived from an XG Boost model, which is crucial for understanding how each feature contributes to predictions. By assessing feature importance, we can uncover which variables have the greatest influence, enabling us to make informed decisions for model improvement and interpretation. To create a clear overview, we initiate by constructing a data frame that organizes both the features and their corresponding important scores, which we retrieve directly from our previously trained XG Boost model.

**31:52** · The important scores reflect how each feature impacts the model's predictions, effectively revealing which ones are the most predictive. By sorting this data frame in descending order, we aim to highlight the most influential features at the top, making it easy to identify key drivers of our model's performance. The expected output of this operation is a neat summary showcasing the features along with their importance values, arranged in a way that emphasizes the strongest contributors.

**32:20** · It's worth noting that while interpreting these scores, one should consider that the importance values can be sensitive to how the model was trained and the nature of the data at hand. It's essential to view this analysis through the lens of the specific context of your project as different features may reveal varying levels of importance based on the underlying relationships in the data set. As we look ahead, this visualization of feature importance sets the stage for our next step in the analysis.

**32:44** · By identifying which features warrant more focus, we can refine our model further, possibly by removing less important features or by exploring interactions between the most significant ones. This will enhance our understanding and pave the way for more sophisticated modeling techniques that build on these insights. Cell 18. In this cell, we're visualizing the feature importance from an XG boost model using a bar chart. This is a crucial step in understanding how each feature contributes to the predictive power of the model and can guide us in further feature engineering or model refinement.

**33:19** · The process begins with creating a figure object that will hold our bar chart. We then add a trace to this figure that details the feature importance values retrieved from the XG boost model. Specifically, we take the feature names from the feature column and their corresponding importance scores from the importance column. A noteworthy detail here is the use of color to enhance the visual representation. We assign colors based on the importance metrics from a random forest model utilizing a red to blue color scale.

**33:48** · This not only helps to differentiate the various important scores but also allows for a visual comparison between the two models. Next, we set up the layout of the chart. The title clearly indicates that this chart represents feature importance for the XG Boost model, while the axes are labeled appropriately to guide our understanding of what we're looking at. The width and height of the figure are adjusted to ensure that all elements fit well and are easy to interpret.

**34:14** · As we display the figure, we can glean insights into which features our XG Boost model relies on most. This is essential for validating our model's decisions and understanding model behavior, especially in contexts like feature selection or tuning.

**34:31** · However, it's important to remember that important scores can sometimes be misleading, particularly in the presence of correlated features, which could inflate the perceived importance of one feature over another. Looking ahead, the next cell will likely leverage these insights to refine our approach to feature selection or might introduce additional model evaluation metrics that can further enhance our understanding of model performance. This is an exciting step as we transition from understanding our model to optimizing it. Cell 19. We have reached the end of the notebook.