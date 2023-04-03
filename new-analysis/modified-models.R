library(plyr) # conflicts with dplyr
library(sciplot)
library(ez)
#library(dplyr) # conflicts with plyr
rm(list=ls())  

setwd("~/Code/diss-model/new-analysis")
source("loading.r");
data_ai_all = load_data(use_all=FALSE, filename="data-0-7-2-new-more-data.csv");
data_ai_all = annotate_data(data_ai_all);
data_ai_all$population = 'ai';
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data_ai_all$pbp = factor(data_ai_all$pbp, levels=c(pbps)) # reorder factor levels
data_ai_feat_on_obj_on = data_ai_all[data_ai_all$feat_base == 0.1 & data_ai_all$obj_base == 0.1,]
data_ai_feat_on_obj_off = data_ai_all[data_ai_all$feat_base == 0.1 & data_ai_all$obj_base == 100,]
data_ai_feat_off_obj_on = data_ai_all[data_ai_all$feat_base == 100 & data_ai_all$obj_base == 0.1,]
data_ai_feat_off_obj_off = data_ai_all[data_ai_all$feat_base == 100 & data_ai_all$obj_base == 100,]
data_ai = data_ai_all;
data = data_ai;
print(100 * sum(data_ai_feat_off_obj_off$found_solution) / length(data_ai_feat_off_obj_off$found_solution));


########### Look at differences between the types of solutions

par(mfrow=c(4,1));
for (pbp in pbps) {
  hist(data_ai$train_time[data_ai$feat_base == 0.1 & data_ai$obj_base == 0.1 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  hist(data_ai$train_time[data_ai$feat_base == 0.1 & data_ai$obj_base == 100 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  #hist(data_ai$train_time[data_ai$feat_base == 100 & data_ai$obj_base == 0.1 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  #hist(data_ai$train_time[data_ai$feat_base == 100 & data_ai$obj_base == 100 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
}
par(mfrow=c(1,1));

t.test(data_ai_feat_off_obj_on[data_ai_feat_off_obj_on$pbp == "26",]$train_time, data_ai_feat_off_obj_off[data_ai_feat_off_obj_off$pbp == "26",]$train_time)

########### Look at differences between the different parametrizations of the algorithm

# feat_off, obj_on is doing much better than feat_on, obj_on
# feat_off, obj_off is doing slightly better than feat_on, obj_off
# feat_off, obj_on is doing slightly better than feat_off, obj_off
par(mfrow=c(1,1));
data_ai_1 = data_ai_feat_off_obj_on
data_ai_2 = data_ai_feat_off_obj_off
#data_ai_1 = data_ai_1[(data_ai_1$sch_cond == 'interleaved' && data_ai_1$sim_cond_wi_pair== 'dissimilar scenes paired') || (data_ai_1$sch_cond == 'blocked' && data_ai_1$sim_cond_wi_pair== 'similar scenes paired'),]
#data_ai_2 = data_ai_2[data_ai_2$cond == 'blocked-sim-sim',]
data_ai_1$difficulty = pmin(2500, data_ai_1$train_time);
data_ai_2$difficulty = pmin(2500, data_ai_2$train_time);

mean_ai_1 = ddply(.data=data_ai_1, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ai_2 = ddply(.data=data_ai_2, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);

plot(mean_ai_1$difficulty, mean_ai_2$difficulty, xlab='model 1 difficulty score', ylab='model 2 difficulty score');
text(mean_ai_1$difficulty, mean_ai_2$difficulty, labels = mean_ai_1$pbp, pos = 4)
cor.test(mean_ai_1$difficulty, mean_ai_1$difficulty, method = "pearson", alternative = "two.sided")
cor.test(mean_ai_2$difficulty, mean_ai_2$difficulty, method = "pearson", alternative = "two.sided")
reg1 <- lm(mean_ai_1$difficulty~mean_ai_2$difficulty)
abline(reg1)

# plot difficulty score histogram
par(mfrow=c(2,1));
for (pbp in pbps) {
  hist(data_ss_34$difficulty[data_ss_34$pbp == pbp], breaks=c(0:31)/10, xlab='difficulty score', main=paste0('PBP ', pbp, ': subjects'));
  hist(data_ai$difficulty[data_ai$feature_prior_strength == 100 & data_ai$pbp == pbp], breaks=c(0:31)/10, xlab='difficulty', main=paste0('PBP ', pbp, ': model'));
}
par(mfrow=c(1,1));














setwd("~/Code/diss-model/new-analysis")
source("loading.r");
data_ai_all = load_data(use_all=FALSE, filename="data-pi_0_7_2_newRandHyp.csv");
data_ai_all = annotate_data(data_ai_all);
data_ai_all$population = 'ai';
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data_ai_all$pbp = factor(data_ai_all$pbp, levels=c(pbps)) # reorder factor levels
data_ai_exploit = data_ai_all[data_ai_all$exploit == 10,]
data_ai_explore = data_ai_all[data_ai_all$exploit == 0.1,]
data_ai = data_ai_all;
print(100 * sum(data_ai_explore$found_solution) / length(data_ai_explore$found_solution));
print(100 * sum(data_ai_exploit$found_solution) / length(data_ai_exploit$found_solution));


########### Look at differences between the types of solutions

par(mfrow=c(2,1));
for (pbp in pbps) {
  hist(data_ai$train_time[data_ai$exploit == 0.1 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  hist(data_ai$train_time[data_ai$exploit == 10 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
}
par(mfrow=c(1,1));

########### Look at differences between the different parametrizations of the algorithm

# feat_off, obj_on is doing much better than feat_on, obj_on
# feat_off, obj_off is doing slightly better than feat_on, obj_off
# feat_off, obj_on is doing slightly better than feat_off, obj_off
par(mfrow=c(1,1));
data_ai_3 = data_ai_exploit
data_ai_4 = data_ai_explore
#data_ai_1 = data_ai_1[(data_ai_1$sch_cond == 'interleaved' && data_ai_1$sim_cond_wi_pair== 'dissimilar scenes paired') || (data_ai_1$sch_cond == 'blocked' && data_ai_1$sim_cond_wi_pair== 'similar scenes paired'),]
#data_ai_2 = data_ai_2[data_ai_2$cond == 'blocked-sim-sim',]
data_ai_3$difficulty = pmin(2500, data_ai_3$train_time);
data_ai_4$difficulty = pmin(2500, data_ai_4$train_time);

mean_ai_3 = ddply(.data=data_ai_3, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ai_4 = ddply(.data=data_ai_4, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);

plot(mean_ai_3$difficulty, mean_ai_4$difficulty, xlab='model 1 difficulty score', ylab='model 2 difficulty score');
text(mean_ai_3$difficulty, mean_ai_4$difficulty, labels = mean_ai_3$pbp, pos = 4)
cor.test(mean_ai_3$difficulty, mean_ai_3$difficulty, method = "pearson", alternative = "two.sided")
cor.test(mean_ai_4$difficulty, mean_ai_4$difficulty, method = "pearson", alternative = "two.sided")
reg1 <- lm(mean_ai_3$difficulty~mean_ai_4$difficulty)
abline(reg1)


plot(mean_ai_1$difficulty, mean_ai_3$difficulty, ylim=c(0,2500), xlim=c(0,2500), xlab='standard PATHS difficulty score', ylab='High exploit model difficulty score');
text(mean_ai_1$difficulty, mean_ai_3$difficulty, labels = mean_ai_1$pbp, pos = 4)
abline(a=0,b=1)

plot(mean_ai_1$difficulty, mean_ai_4$difficulty, ylim=c(0,2500), xlim=c(0,2500), xlab='standard PATHS difficulty score', ylab='High explore model difficulty score');
text(mean_ai_1$difficulty, mean_ai_4$difficulty, labels = mean_ai_1$pbp, pos = 4)
abline(a=0,b=1)

