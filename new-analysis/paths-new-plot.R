################################################################################
# This uses the new plot style that includes error bars and solution rate to
# plot both the difficulty score and the time-to-solution of PATHS versus human
# data.
################################################################################

library(plyr) # conflicts with dplyr
rm(list=ls())

pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');

########### Load People Data

setwd("~/Dropbox/Bongard Problems/pbp_mturk_exp3_2")
source("loading.r");
data_ss = load_data();
data_ss = annotate_data(data_ss);
data_ss$population = 'subjects';
data_ss = data_ss[data_ss$pbp %in% pbps,] # filter: only use pbps we also use in the machine learning case
data_ss$pbp = factor(data_ss$pbp, levels=c(pbps)) # reorder factor levels
data_ss = data_ss[order(data_ss$pbp),] # reorder columns according to the pbp factor

setwd("~/Dropbox/Bongard Problems/pbp_mturk_exp4")
source("loading.r");
data_ss4 = load_data();
data_ss4 = annotate_data(data_ss4);
data_ss4$population = 'subjects';
data_ss4 = data_ss4[data_ss4$pbp %in% pbps,] # filter: only use pbps we also use in the machine learning case
data_ss4$pbp = factor(data_ss4$pbp, levels=c(pbps)) # reorder factor levels
data_ss4 = data_ss4[order(data_ss4$pbp),] # reorder columns according to the pbp factor
data_subjects = merge(data_ss, data_ss4, all=T);
data_subjects$difficulty = ifelse(data_subjects$found_solution == 0, 10.0, pmin(10.0, data_subjects$train_time/1000/60));

########### Load PATHS Data

setwd("~/Code/diss-model/new-analysis")
source("loading.r");
data_ai_all = load_data(use_all=FALSE, filename="data-0-7-2-new-more-data.csv");
data_ai_all = annotate_data(data_ai_all);
data_ai_all$population = 'ai';
data_ai_all$pbp = factor(data_ai_all$pbp, levels=c(pbps)) # reorder factor levels
data_ai_all = data_ai_all[order(data_ai_all$pbp),] # reorder columns according to the pbp factor
data_ai_feat_on_obj_on = data_ai_all[data_ai_all$feat_base == 0.1 & data_ai_all$obj_base == 0.1,]
data_ai_feat_on_obj_off = data_ai_all[data_ai_all$feat_base == 0.1 & data_ai_all$obj_base == 100,]
data_ai_feat_off_obj_on = data_ai_all[data_ai_all$feat_base == 100 & data_ai_all$obj_base == 0.1,]
data_ai_feat_off_obj_off = data_ai_all[data_ai_all$feat_base == 100 & data_ai_all$obj_base == 100,]
data_paths = data_ai_feat_off_obj_on;
data_paths$difficulty = pmin(2500, data_paths$train_time);

# will conflict with libraries used above; restart R if you need to rerun things
# from the top
library(tidyverse)

################################################################################
# Figure 1: human vs model difficulty scores (all attempts) 
################################################################################

byseveral<-group_by(data_paths,pbp)
mean_paths<-summarize(byseveral,accPaths=mean(found_solution),difficultyPaths=mean(difficulty),sdPaths=sd(difficulty),nPaths=n(),sePaths=sdPaths/sqrt(nPaths))
mean_paths_no_31<-mean_paths[mean_paths$pbp != "31",]

byseveral<-group_by(data_subjects,pbp)
mean_subjects<-summarize(byseveral,accSubjects=mean(found_solution),difficultySubjects=mean(difficulty),sdSubjects=sd(difficulty),nSubjects=n(),seSubjects=sdSubjects/sqrt(nSubjects))
mean_subjects_no_31<-mean_subjects[mean_subjects$pbp != "31",]

combined<-merge(mean_paths,mean_subjects,all=TRUE)
levels(combined$pbp)[levels(combined$pbp) == "11b"] <- "11"
combined$offsetX = -0.3
combined$offsetY = 2
combined[combined$pbp == '2',]$offsetX = 1.5
combined[combined$pbp == '2',]$offsetY = -0.8
combined[combined$pbp == '8',]$offsetX = 1.5
combined[combined$pbp == '11',]$offsetX = -0.3
combined[combined$pbp == '11',]$offsetY = 1.8
combined[combined$pbp == '22',]$offsetX = -0.8
combined[combined$pbp == '22',]$offsetY = 0.5
combined[combined$pbp == '30',]$offsetX = 1.5
combined[combined$pbp == '30',]$offsetY = -0.8

cor.test(mean_paths_no_31$difficultyPaths, mean_subjects_no_31$difficultySubjects, method = "pearson", alternative = "two.sided")
reg1 <- lm(mean_subjects_no_31$difficultySubjects~mean_paths_no_31$difficultyPaths)

ggplot(combined,aes(x=difficultyPaths,y=difficultySubjects)) +
  geom_point(aes(color=accSubjects), alpha=1, size = 5) +
  #geom_point(size = 2.5, color='white', alpha=0.5) +
  geom_point(aes(color=accPaths), alpha=1, size = 2.5) +
  geom_errorbarh(aes(xmin = difficultyPaths-sePaths, xmax = difficultyPaths+sePaths))+
  geom_errorbar(aes(ymin = difficultySubjects-seSubjects, ymax = difficultySubjects+seSubjects))+
  xlab("model difficulty score")+ylab("human difficulty score")+
  #geom_abline(intercept = 0, slope = 10/2250, color="red", size=0.5)+
  geom_abline(intercept=reg1$coefficients[1], slope=reg1$coefficients[2], color="red", size=0.5)+
  geom_text(aes(hjust=offsetX, vjust=offsetY, label=pbp), size=3.5) +
  guides(alpha = "none")+
  labs(colour='Accuracy')+
  coord_cartesian(xlim=c(0,2250), ylim = c(2.5,8.4))+
  scale_colour_gradient(low='#125699', high='#A5D3FF')

# Inner: accuracy of base model, Outer: accuracy of exploitation-based model.
# Warning: The variance / error bars are a very crude meassure 

ggsave(
  'paths-vs-subjects1.png',
  plot = last_plot(),
  scale = 1,
  width = 13,
  height = 8,
  units = "cm",
  dpi = 150,
)

################################################################################
# Figure 2: human vs model solution times (only successful attempts) 
################################################################################

data_paths_solved = data_paths[data_paths$found_solution == 1,]
byseveral<-group_by(data_paths_solved,pbp)
mean_paths<-summarize(byseveral,accPaths=mean(found_solution),trainTimePaths=mean(train_time),sdPaths=sd(train_time),nPaths=n(),sePaths=sdPaths/sqrt(nPaths))

data_subjects_solved = data_subjects[data_subjects$found_solution == 1,]
data_subjects_solved$cappedTrainTime = pmin(data_subjects_solved$train_time/1000/60,10);
byseveral<-group_by(data_subjects_solved,pbp)
mean_subjects<-summarize(byseveral,accSubjects=mean(found_solution),trainTimeSubjects=mean(cappedTrainTime),sdSubjects=sd(cappedTrainTime),nSubjects=n(),seSubjects=sdSubjects/sqrt(nSubjects))

combined<-merge(mean_paths,mean_subjects,all=TRUE)
levels(combined$pbp)[levels(combined$pbp) == "11b"] <- "11"
combined$offsetX = -0.2
combined$offsetY = 1.8
combined[combined$pbp == '4',]$offsetX = 0.2
combined[combined$pbp == '22',]$offsetX = -0.5
combined[combined$pbp == '22',]$offsetY = 0
combined[combined$pbp == '13',]$offsetX = 1.2
combined[combined$pbp == '13',]$offsetY = -1.0
combined[combined$pbp == '30',]$offsetX = -0.5
combined[combined$pbp == '30',]$offsetY = 0
combined[combined$pbp == '2',]$offsetX = 1.9
combined[combined$pbp == '2',]$offsetY = 0.6

cor.test(mean_paths$trainTimePaths, mean_subjects$trainTimeSubjects, method = "pearson", alternative = "two.sided")
reg2 <- lm(mean_subjects$trainTimeSubjects~mean_paths$trainTimePaths)

ggplot(combined,aes(x=trainTimePaths,y=trainTimeSubjects)) +
  geom_point(color='#125699', alpha=0.8, size = 3.5) +
  geom_errorbarh(aes(xmin = trainTimePaths-sePaths, xmax = trainTimePaths+sePaths))+
  geom_errorbar(aes(ymin = trainTimeSubjects-seSubjects, ymax = trainTimeSubjects+seSubjects))+
  xlab("model actions to solution")+ylab("human solution time in min")+
  geom_abline(intercept=reg2$coefficients[1], slope=reg2$coefficients[2], color="red", size=0.5)+
  geom_text(aes(hjust=offsetX, vjust=offsetY, label=pbp), size=3.5) +
  coord_cartesian(xlim=c(0,1500), ylim = c(0.0,2.0))

# Inner: accuracy of base model, Outer: accuracy of exploitation-based model.
# Warning: The variance / error bars are a very crude meassure 

ggsave(
  'paths-vs-subjects2.png',
  plot = last_plot(),
  scale = 1,
  width = 11,
  height = 8,
  units = "cm",
  dpi = 150,
)

