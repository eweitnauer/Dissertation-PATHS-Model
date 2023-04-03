################################################################################
# This compares the original performance of PATHS with a variant where we switch
# on or off two of PATHS mechanisms for adaptive perception:
# 1. Adaptive selection of features for perception (off by default)
# 2. Adaptive selection of objects for perception (on by default)
#
# The selection of hypotheses is PAHTS main method of adaptive perception and
# building of more detailed hypotheses and the additional mechanisms in 1 and 2
# can lead to going down the garden-path / searching some parts of the solution
# space too deeply at the cost of other, less complicated hypotheses.
#
# The most interesting comparison here is for problem 26 between standard PATHS
# and a version that turns off adaptive object selection (2). Most problems do
# not benefit from (2), but problem 26 is designed in a way that it does.
################################################################################

library(plyr) # conflicts with dplyr
library(sciplot)
library(ez)
rm(list=ls())  

## Read original data
setwd("~/Code/diss-model/new-analysis")
source("loading.r");
data = load_data(use_all=FALSE, filename="data-0-7-2-new-more-data.csv");
data = annotate_data(data);
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data$pbp = factor(data$pbp, levels=c(pbps)) # reorder factor levels
data_feat_on_obj_on = data[data$feat_base == 0.1 & data$obj_base == 0.1,]
data_feat_on_obj_off = data[data$feat_base == 0.1 & data$obj_base == 100,]
data_feat_off_obj_on = data[data$feat_base == 100 & data$obj_base == 0.1,]
data_feat_off_obj_off = data[data$feat_base == 100 & data$obj_base == 100,]


# pick the default condition of PATHS and the version that turns off adaptive object for our comparison
data_1 = data_feat_off_obj_on
data_2 = data_feat_off_obj_off

# the main difference is for problem 26, here is the p-value for that:
t.test(data_1[data_1$pbp == "26",]$train_time, data_2[data_2$pbp == "26",]$train_time)

# Notes on differences:
# - feat_off, obj_on is doing much better than feat_on, obj_on
# - feat_off, obj_off is doing slightly better than feat_on, obj_off
# - feat_off, obj_on is doing slightly better than feat_off, obj_off

data_1$difficulty = pmin(2500, data_1$train_time);
data_2$difficulty = pmin(2500, data_2$train_time);
mean_1 = ddply(.data=data_1, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_2 = ddply(.data=data_2, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);

# only problem 26 has a clear difference
par(mfrow=c(1,1));
plot(mean_1$difficulty, mean_2$difficulty, xlab='PATHS difficulty score', ylab='model 2 difficulty score');
text(mean_1$difficulty, mean_2$difficulty, labels = mean_1$pbp, pos = 4)
abline(a=0,b=1)
