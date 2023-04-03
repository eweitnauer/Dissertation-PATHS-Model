################################################################################
# This compares the original performance of PATHS with a variant where we switch
# physics off.
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
# pick the default condition of PATHS
data_base = data_feat_off_obj_on

## Read the data from the modified model that turns off physics
data_no_physics = load_data(use_all=FALSE, filename="data-pi_0_7_2_noPhysics.csv");
data_no_physics= annotate_data(data_no_physics);
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data_no_physics$pbp = factor(data_no_physics$pbp, levels=c(pbps)) # reorder factor levels

data_base$difficulty = pmin(2500, data_base$train_time);
data_no_physics$difficulty = pmin(2500, data_no_physics$train_time);

library(tidyverse)

byseveral<-group_by(data_base,pbp)
mean_base<-summarize(byseveral,accBase=mean(found_solution),difficultyBase=mean(difficulty),sdBase=sd(difficulty),nBase=n(),seBase=sdBase/sqrt(nBase))
mean_base

byseveral<-group_by(data_no_physics,pbp)
mean_no_physics<-summarize(byseveral,accNoP=mean(found_solution),difficultyNoP=mean(difficulty),sdNoP=sd(difficulty),nNoP=n(),seNoP=sdNoP/sqrt(nNoP))
mean_no_physics

combined<-merge(mean_base,mean_no_physics,all=TRUE)
combined$offsetX = -0.35
combined$offsetY = 2.2
combined[combined$pbp == '2',]$offsetX = 1.5
combined[combined$pbp == '2',]$offsetY = -1.5
combined[combined$pbp == '8',]$offsetX = 1
combined[combined$pbp == '22',]$offsetX = 0.4
combined[combined$pbp == '22',]$offsetY = 2.5
combined[combined$pbp == '30',]$offsetX = -0.25

ggplot(combined,aes(x=difficultyBase,y=difficultyNoP)) +
  geom_point(aes(color=accNoP), alpha=1, size = 8) +
  geom_point(size = 5, color='white', alpha=0.5) +
  geom_point(aes(color=accBase), alpha=1, size = 4.5) +
  geom_errorbarh(aes(xmin = difficultyBase-seBase, xmax = difficultyBase+seBase))+
  geom_errorbar(aes(ymin = difficultyNoP-seNoP, ymax = difficultyNoP+seNoP))+
  xlab("Average Steps For Baseline Model")+ylab("Average Steps For No-Physics Model")+
  geom_abline(intercept = 0, slope = 1, color="red", size=0.5)+
  geom_text(aes(hjust=offsetX, vjust=offsetY, label=pbp), size=3.5) +
  guides(alpha = "none")+
  labs(colour='Accuracy')+
  coord_cartesian(xlim=c(0,2500), ylim = c(0,2500))+
  scale_colour_gradient(low='#125699', high='#A5D3FF')

ggsave(
  'physicsLesion.png',
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