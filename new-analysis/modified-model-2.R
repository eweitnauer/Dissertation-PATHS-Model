################################################################################
# This compares the original performance of PATHS with a variant where we change
# how hypotheses are selected for testing and recombination. The exploit variant
# strongly focuses on the most likely hypothesis, while the explore variant will
# select almost equally among all current hypotheses.
#
# The most interesting comparison here is between PATHS and the exploit variant,
# which does worse for hard problems, but the same (or better) for easy ones.
################################################################################

library(plyr) # conflicts with dplyr
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
# pick the default condition of PATHS for our comparison
data_base = data_feat_off_obj_on;

## Read the data from the modified model that changes hypotheses selection
setwd("~/Code/diss-model/new-analysis")
source("loading.r");
data = load_data(use_all=FALSE, filename="data-pi_0_7_2_newRandHyp.csv");
data = annotate_data(data);
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data$pbp = factor(data$pbp, levels=c(pbps)) # reorder factor levels
data_exploit = data[data$exploit == 10,]
data_explore = data[data$exploit == 0.1,]
print(100 * sum(data_explore$found_solution) / length(data_explore$found_solution));
print(100 * sum(data_exploit$found_solution) / length(data_exploit$found_solution));

data_base$difficulty = pmin(2500, data_base$train_time);
data_exploit$difficulty = pmin(2500, data_exploit$train_time);
data_explore$difficulty = pmin(2500, data_explore$train_time);

library(sciplot)
library(ez)

# just for debugging - look at the histogram of solution lengths
par(mfrow=c(2,1));
for (pbp in pbps) {
  hist(data_base$difficulty[data_base$pbp == pbp], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution', main=paste0('PBP ', pbp, ': base'));
  hist(data_exploit$difficulty[data_exploit$pbp == pbp], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution', main=paste0('PBP ', pbp, ': exploit'));
}
par(mfrow=c(1,1));

mean_base = ddply(.data=data_base, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_explore = ddply(.data=data_explore, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_exploit = ddply(.data=data_exploit, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);

# Exploit vs. base -- use this one
plot(mean_base$difficulty, mean_exploit$difficulty, ylim=c(0,2500), xlim=c(0,2500), xlab='standard PATHS difficulty score', ylab='Exploit model difficulty score');
text(mean_base$difficulty, mean_exploit$difficulty, labels = mean_base$pbp, pos = 4)
abline(a=0,b=1)

# Explore vs base
plot(mean_base$difficulty, mean_explore$difficulty, ylim=c(0,2500), xlim=c(0,2500), xlab='standard PATHS difficulty score', ylab='Explore model difficulty score');
text(mean_base$difficulty, mean_explore$difficulty, labels = mean_base$pbp, pos = 4)
abline(a=0,b=1)

library(tidyverse)

byseveral<-group_by(data_base,pbp)
mean_base<-summarize(byseveral,accBase=mean(found_solution),difficultyBase=mean(difficulty),sdBase=sd(difficulty),nBase=n(),seBase=sdBase/sqrt(nBase))
mean_base

byseveral<-group_by(data_exploit,pbp)
mean_exploit<-summarize(byseveral,accExploit=mean(found_solution),difficultyExploit=mean(difficulty),sdExploit=sd(difficulty),nExploit=n(),seExploit=sdExploit/sqrt(nExploit))
mean_exploit

combined<-merge(mean_base,mean_exploit,all=TRUE)
combined$offsetX = -0.3
combined$offsetY = 2
combined[combined$pbp == '22',]$offsetX = 1.5
combined[combined$pbp == '22',]$offsetY = -1
combined[combined$pbp == '30',]$offsetX = 1.5
combined[combined$pbp == '30',]$offsetY = -1

ggplot(combined,aes(x=difficultyBase,y=difficultyExploit)) +
  geom_point(aes(color=accExploit), alpha=1, size = 8) +
  geom_point(size = 5, color='white', alpha=0.5) +
  geom_point(aes(color=accBase), alpha=1, size = 4.5) +
  geom_errorbarh(aes(xmin = difficultyBase-seBase, xmax = difficultyBase+seBase))+
  geom_errorbar(aes(ymin = difficultyExploit-seExploit, ymax = difficultyExploit+seExploit))+
  xlab("Average Steps For Baseline Model")+ylab("Average Steps For Exploitation-biased Model")+
  geom_abline(intercept = 0, slope = 1, color="red", size=0.5)+
  geom_text(aes(hjust=offsetX, vjust=offsetY, label=pbp), size=3.5) +
  guides(alpha = "none")+
  labs(colour='Accuracy')+
  scale_colour_gradient(low='#125699', high='#A5D3FF')

ggsave(
  'exploitLesion.png',
  plot = last_plot(),
  scale = 1,
  width = 15,
  height = 12.66,
  units = "cm",
  dpi = 150,
)
# Inner: accuracy of base model, Outer: accuracy of exploitation-based model.

## Warning:
# The variance / error bars are a very crude messure 
