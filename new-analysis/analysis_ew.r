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
  hist(data_ai$train_time[data_ai$feat_base == 100 & data_ai$obj_base == 0.1 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  hist(data_ai$train_time[data_ai$feat_base == 100 & data_ai$obj_base == 100 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
}
par(mfrow=c(1,1));

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

########### Load People Data

setwd("~/Dropbox/Bongard Problems/pbp_mturk_exp3_2")
source("loading.r");
data_ss = load_data();
data_ss = annotate_data(data_ss);
data_ss$population = 'subjects';
#data_ss$pbp = revalue(data_ss$pbp, c("2" = "pbp02", "4" = "pbp04", "8" = "pbp08", "11b" = "pbp11b", "12" = "pbp12", "13" = "pbp13", "16" = "pbp16", "18" = "pbp18", "20" = "pbp20", "22" = "pbp22", "26" = "pbp26", "30" = "pbp30", "31" = "pbp31"));
#pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp30', 'pbp31');
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data_ss = data_ss[data_ss$pbp %in% pbps,] # filter: only use pbps we also use in the machine learning case
data_ss$pbp = factor(data_ss$pbp, levels=c(pbps)) # reorder factor levels
data_ss = data_ss[order(data_ss$pbp),] # reorder columns according to the pbp factor

setwd("~/Dropbox/Bongard Problems/pbp_mturk_exp4")
source("loading.r");
data_ss4 = load_data();
data_ss4 = annotate_data(data_ss4);
data_ss4$population = 'subjects';
#data_ss4$pbp = revalue(data_ss4$pbp, c("2" = "pbp02", "4" = "pbp04", "8" = "pbp08", "11b" = "pbp11b", "12" = "pbp12", "13" = "pbp13", "16" = "pbp16", "18" = "pbp18", "20" = "pbp20", "22" = "pbp22", "26" = "pbp26", "31" = "pbp31"));
#pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp31');
pbps = c('2', '4', '8', '11b', '12', '13', '16', '18', '20', '22', '26', '30', '31');
data_ss4 = data_ss4[data_ss4$pbp %in% pbps,] # filter: only use pbps we also use in the machine learning case
data_ss4$pbp = factor(data_ss4$pbp, levels=c(pbps)) # reorder factor levels
data_ss4 = data_ss4[order(data_ss4$pbp),] # reorder columns according to the pbp factor
data_ss4_a = data_ss4;
data_ss4_a$flag = ' keep me';
data_ss4_b = data_ss4;
data_ss4_b$flag = 'delete me (I\'m identical)';
data_ss4_ab = merge(data_ss4_a, data_ss4_b, all=T);

data_ss_34 = merge(data_ss, data_ss4, all=T);

data_all = merge(data_ai, data_ss[c("pbp", "cond", "found_solution", "train_time", "population")], all=T);
  
# print solutions ordered by frequency per problem:
pbp = '36';
sols = count(data[data$found_solution==1 & data$pbp==pbp,]$sol);
sols[order(sols$freq),]


## scatter plot of time to solution

#hist(data_ss$train_time[data_ss$pbp == pbp & data_ss$found_solution == 1 & data_ss$train_time < 1000*60*12]/1000/60, breaks=c(0:100)/3, xlim=c(0,10), xlab='time to solution in minutes', main=paste0('PBP ', pbp, ': subjects'));

pbp=35
hist(data_ai$train_time[data_ai$feature_prior_strength == 100 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));

setwd("~/Code/diss/modelling/current/analysis")
for (pbp in c(pbps,'35','36')) {
  pdf(file=paste0("time-hist-pbp",pbp,".pdf"),height=2, width=2, pointsize=7)
  par(mar=c(3,3,0.5,0)+0.2)
  par(mfrow=c(2,1));
  par(mgp=c(2.2,1,0));
  if (pbp == '35' | pbp == '36') plot.new()
  else {
    hist(data_ss_34$train_time[data_ss_34$pbp == pbp & data_ss_34$found_solution == 1 & data_ss_34$train_time < 1000*60*12]/1000/60, breaks=c(0:100)/3, xlim=c(0,10), xlab='time to solution in minutes', main='')#paste0('PBP ', pbp, ': subjects'));    
  }
  hist(data_ai$train_time[data_ai$feature_prior_strength == 100 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution', main='')#paste0('PBP ', pbp, ': model'));
  par(mfrow=c(1,1));
  dev.off();
}

par(mfrow=c(2,1));
for (pbp in pbps) {
  hist(data_ss_34$train_time[data_ss_34$pbp == pbp & data_ss_34$found_solution == 1 & data_ss_34$train_time < 1000*60*12]/1000/60, breaks=c(0:100)/3, xlim=c(0,10), xlab='time to solution in minutes', main=paste0('PBP ', pbp, ': subjects'));
  hist(data_ai$train_time[data_ai$feature_prior_strength == 100 & data_ai$pbp == pbp & data_ai$found_solution == 1 & data_ai$train_time], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
}
par(mfrow=c(1,1));

####### VISUALIZE PER PROBLEM

bargraph.CI(x.factor=pbp,response=found_solution,ylim=c(0.0, 1.1),data=data_ai,legend=T,ylab='correct answer rate',main='AI');
bargraph.CI(x.factor=pbp,response=train_time,data=data_ai,legend=T,ylab='steps to solution of fail', main='AI');
bargraph.CI(x.factor=pbp,response=train_time,data=data_ai[data_ai$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')

bargraph.CI(x.factor=pbp,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate', main='Subjects');
bargraph.CI(x.factor=pbp,response=train_time,data=data_ss[data_ss$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='Subjects')
bargraph.CI(x.factor=pbp,response=subject_pairs_seen,data=data_ss[data_ss$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='Subjects')

bargraph.CI(x.factor=pbp,group=population,response=found_solution,ylim=c(0.0, 1.1),data=data_all,legend=T,ylab='correct answer rate',main='AI');
par(mfrow=c(2,1));
bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ai,legend=T,ylab='correct answer rate', main='AI')
bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate', main='Subjects')
par(mfrow=c(1,1));

par(mfrow=c(2,1));
bargraph.CI(x.factor=pbp,group=sim_cond_wi_cat,response=found_solution,ylim=c(0.0, 1.1),data=data_ai,legend=T,ylab='correct answer rate', main='AI')
bargraph.CI(x.factor=pbp,group=sim_cond_wi_cat,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate', main='Subjects')
par(mfrow=c(1,1));

par(mfrow=c(2,1));
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')
bargraph.CI(x.factor=pbp,group=sch_cond,response=subject_pairs_seen,data=data_ss[data_ss$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')
bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate', main='Subjects')
par(mfrow=c(1,1));

par(mfrow=c(2,1));
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')
bargraph.CI(x.factor=pbp,group=sch_cond,response=subject_pairs_seen,data=data_ss[data_ss$found_solution == 1 & data_ss$subject_pairs_seen<=100,],legend=T,ylab='scene pairs seen', main='Subjects')
#plot(table(data_ss$subject_pairs_seen))
#bargraph.CI(x.factor=pbp,group=sch_cond,response=subject_pairs_seen,data=data_ss[data_ss$found_solution == 1 & data_ss$subject_pairs_seen<1360,],legend=T,ylab='scene pairs seen', main='Subjects')
#bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data_ss[data_ss$found_solution == 1 & data_ss$train_time<300000,],legend=T,ylab='train time in seconds for trails solved in max. 5 minutes')
#bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data_ss[data_ss$found_solution == 1,],legend=T,ylab='train time in seconds')
par(mfrow=c(1,1));

par(mfrow=c(2,1));
bargraph.CI(x.factor=pbp,group=sim_cond_bw_cat,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')
bargraph.CI(x.factor=pbp,group=sim_cond_bw_cat,response=subject_pairs_seen,data=data_ss[data_ss$found_solution == 1 & data_ss$subject_pairs_seen<=100,],legend=T,ylab='scene pairs seen', main='Subjects')

### all conds

bargraph.CI(x.factor=pbp,group=cond,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=F,ylab='correct answer rate')
bargraph.CI(x.factor=pbp,group=cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=pbp,group=cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials')

bargraph.CI(x.factor=pbp,group=cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')
bargraph.CI(group=sim_cond_both_cat, x.factor=sch_cond, response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')

bargraph.CI(group=sim_cond_both_cat, x.factor=sch_cond, response=train_time,data=data_ai,legend=T,ylab='steps to solution or fail')
bargraph.CI(group=sim_cond_both_cat, x.factor=sch_cond, response=train_time,data=data_ai[data_ai$found_solution == 1,],legend=T,ylab='steps for solved trials')

### feature1st

bargraph.CI(x.factor=pbp,group=feature1st,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate', main='pick feature first')
bargraph.CI(x.factor=pbp,group=feature1st,response=train_time,data=data,legend=T,ylab='steps to solution or fail' , main='pick feature first')
bargraph.CI(x.factor=pbp,group=feature1st,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', , main='pick feature first')

### sch_cond

bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials')

bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')

### sim_cond for blocked

bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),data=data[data$sch_cond=='blocked',],legend=T,ylab='correct answer rate', main='blocked presentation trials')
bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=train_time,ylim=c(0.0, 2500),data=data[data$sch_cond=='blocked',],legend=T,ylab='steps to solution or fail', main='blocked presentation trials')
bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=train_time,ylim=c(0.0, 2500),data=data[data$sch_cond=='blocked' & data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='blocked presentation trials')

### sim_cond for interleaved

bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),data=data[data$sch_cond=='interleaved',],legend=T,ylab='correct answer rate', main='blocked presentation trials')
bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=train_time,ylim=c(0.0, 2500),data=data[data$sch_cond=='interleaved',],legend=T,ylab='steps to solution or fail', main='blocked presentation trials')
bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=train_time,ylim=c(0.0, 2500),data=data[data$sch_cond=='interleaved' & data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='blocked presentation trials')

### sim_cond_wi_cat, sim_cond_bw_cat

bargraph.CI(x.factor=pbp,group=sim_cond_wi_cat,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate', main='w/i similarity')
bargraph.CI(x.factor=pbp,group=sim_cond_wi_cat,response=train_time,data=data,ylim=c(0,2500),legend=T,ylab='steps to solution or fail', main='w/i similarity')

bargraph.CI(x.factor=pbp,group=sim_cond_bw_cat,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate', main='b/w similarity')
bargraph.CI(x.factor=pbp,group=sim_cond_bw_cat,response=train_time,data=data,ylim=c(0,2500),legend=T,ylab='steps to solution or fail', main='b/w similarity')


####### COLLAPSED

### all conds AI

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.8, 0.9),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials')


bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,ylim=c(600,1000),data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='steps to solution or fail 100')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=log(train_time),ylim=c(5.5,6.5),data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=1/train_time,ylim=c(0.003, 0.008),data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='1/actions to solution or fail')

### all conds Ss

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time/60/1000,data=data_ss[data_ss$train_time<1000*60*10,],legend=T,ylab='minutes to solution or fail')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,ylim=c(10,12),response=log(train_time),data=data_ss[data_ss$train_time<1000*60*10,],legend=T,ylab='minutes to solution or fail')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=1/train_time,data=data_ss[data_ss$train_time<1000*60*10,],legend=T,ylab='minutes to solution or fail')

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,data=data_ss[data_ss$found_solution==1 & data_ss$train_time < 1000*60*12,],legend=T,ylab='steps to solution for solved trials')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=subject_pairs_seen,data=data_ss,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=subject_pairs_seen,data=data_ss[data_ss$found_solution==1,],legend=T,ylab='steps to solution for solved trials')

### sch_cond

bargraph.CI(x.factor=sch_cond,response=found_solution,data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=sch_cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=sch_cond,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials')
## Ss
bargraph.CI(x.factor=sch_cond,response=found_solution,data=data_ss,legend=T,ylab='subjects acc')

### sim_cond_wi_cat, sim_cond_bw_cat

bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='AI w/i similarity')

bargraph.CI(x.factor=sim_cond_wi_cat,response=found_solution,data=data,legend=T,ylab='correct answer rate', main='w/i similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=train_time,data=data,legend=T,ylab='steps to solution or fail', main='w/i similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='w/i similarity')
bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_wi_cat,data=data,legend=T,ylab='correct answer rate', main='w/i similarity')
bargraph.CI(x.factor=sim_cond_bw_cat,response=found_solution,data=data,legend=T,ylab='correct answer rate', main='b/w similarity')
bargraph.CI(x.factor=sim_cond_bw_cat,response=train_time,data=data,legend=T,ylab='steps to solution or fail', main='b/w similarity')
bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_bw_cat,data=data,legend=T,ylab='correct answer rate', main='b/w similarity')

bargraph.CI(x.factor=sch_cond,response=train_time,group=sim_cond_bw_cat,data=data,legend=T,ylab='steps to solution for solved trials', main='b/w similarity')
bargraph.CI(x.factor=sch_cond,response=train_time,group=sim_cond_wi_cat,data=data_ai,legend=T,ylab='steps to solution for solved trials', main='w/i similarity')

bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,group=sim_cond_wi_cat,data=data_ss,legend=T,ylab='steps to solution for solved trials', main='Subjects w/i similarity')

bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_bw_cat,data=data_ss,legend=T,ylab='steps to solution for solved trials', main='Subjects b/w similarity')





ezANOVA(data=data,dv=found_solution,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data[data$found_solution==1,],dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))


ezANOVA(data=data_ai,dv=train_time,wid=mturk_id,within=.(feature_prior_strength))

data_ai$log_train_time = log(data_ai$train_time)
data_ai$inv_train_time = 1/data_ai$train_time
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=log_train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=inv_train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))

ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat),within_covariates=pbp_accuracy)
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100 & data_ai$found_solution==1,],dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_pair,sim_cond_bw_pair))
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100 & data_ai$found_solution==1,],dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_pair,sim_cond_bw_pair))


## graphs for the paper

### schedule, use?

#bargraph.CI(x.factor=sch_cond,response=train_time,data=data_ai[data_ai$found_solution == 1,],legend=T,ylab='train time')
bargraph.CI(x.factor=sch_cond,response=train_time,data=data_ai,legend=T,ylab='train time')
#bargraph.CI(x.factor=sch_cond,response=found_solution,data=data_ai,legend=T,ylab='train time', ylim=c(0.7,0.9))
bargraph.CI(x.factor=sch_cond,response=found_solution,data=data_ss,legend=T,ylab='subjects acc')

### difficulty, use?

bargraph.CI(x.factor=pbp,response=train_time,data=data_ai[data_ai$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ai,legend=T,ylab='correct answer rate'); #, main='AI')
bargraph.CI(x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai,legend=T,ylab='actions taken'); #, main='AI')
bargraph.CI(x.factor=pbp,response=train_time,data=data_ai,legend=T,ylab='actions taken', main='AI')
bargraph.CI(x.factor=pbp,response=1-found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='no answer rate', main='Subjects');
bargraph.CI(x.factor=pbp,response=train_time,data=data_ss,legend=T,ylab='no answer rate', main='Subjects');

### difficulty & schedule, don't use

#bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
#bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')

### all conditions, don't use

bargraph.CI(data=data[data$found_solution==1,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='steps to solution for solved trials')
#bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(data=data_ss,x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),legend=T,ylab='correct answer rate')
bargraph.CI(data=data_ss[data_ss$found_solution==1,],x.factor=sch_cond,group=sim_cond_both_cat,response=subject_pairs_seen,legend=T,ylab='scene pairs seen in correct trials')
bargraph.CI(data=data_ss[data_ss$found_solution==1,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='scene pairs seen in correct trials')

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,ylim=c(600,1200),data=data_ai,legend=T,ylab='actions taken')

### USE w/i sim. per schedule

#bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='AI w/i similarity')
#bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_wi_cat,data=data_ss,legend=T,ylab='acc', main='Subjects w/i similarity')

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-wi-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='steps to solution or fail', ylim=c(500,1000)); #, main='AI w/i similarity'
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS4-wi-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
#bargraph.CI(x.factor=sch_cond,response=1-found_solution,group=sim_cond_wi_cat,data=data_ss4,legend=T,ylab='wrong/no answer rate', ylim=c(0.2,0.8));# main='Subjects w/i similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=1-found_solution,data=data_ss4[data_ss4$sch_cond=='simultaneous',],legend=T,ylab='wrong/no answer rate', ylim=c(0.2,0.8));# main='Subjects w/i similarity')
dev.off();

### USE b/w sim. per schedule

#bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='AI b/w similarity')
#bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=found_solution,data=data,legend=T,ylab='steps to solution or fail', main='AI b/w similarity', ylim=c(0.75,0.85))

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-bw-sim-by-sched-v0.7.0.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='steps to solution or fail', ylim=c(500,1000)); #, main='AI b/w similarity')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS3-bw-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=1-found_solution,group=sim_cond_bw_cat,data=data_ss,legend=T,ylab='wrong/no answer rate', ylim=c(0.2,0.8));#, main='Subjects b/w similarity')
dev.off();

### FINAL PLOTS FOR COGSCI 2015 ###########################

## w/i PAIR similarity for AI
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-steps-by-wi-pair-sim-v0.7.0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=train_time,group=sim_cond_wi_pair,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='action taken', ylim=c(500,1000), x.leg=3.6, y.leg=1200);
dev.off();

## w/i PAIR similarity for Ss3
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS3-error-by-wi-pair-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=1-found_solution,group=sim_cond_wi_pair,data=data_ss,legend=T,ylab='error rate', ylim=c(0,1.01), x.leg=3.6);
dev.off();

## w/i category similarity for Ss4
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS4-error-by-wi-cat-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(group=sim_cond_wi_cat,x.factor=flag,response=1-found_solution,data=data_ss4_ab,legend=T,ylab='error rate', ylim=c(0,1.01), x.leg=1);
dev.off();
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS4-error-by-bw-cat-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=flag, group=sim_cond_bw_cat,response=1-found_solution,data=data_ss4_ab,legend=T,ylab='error rate', ylim=c(0,1.01), x.leg=0.85);
dev.off();


## AI performance per problem

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-acc-per-problem-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ai[data_ai$feature_prior_strength == 100,],legend=T,ylab='correct answer rate'); #, main='AI')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS3-acc-per-problem.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ss,legend=T,ylab='correct answer rate');
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-steps-per-problem-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai[data_ai$feature_prior_strength == 100,],legend=T,ylab='actions taken'); #, main='AI')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-steps-per-solved-problem-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(col='gray',x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai[data_ai$feature_prior_strength == 100,],legend=T,ylab='actions taken'); #, main='AI')
par(new=TRUE)
bargraph.CI(col='steelblue',x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai[data_ai$feature_prior_strength == 100 & data_ai$found_solution == 1,],legend=T,ylab='actions taken'); #, main='AI')
dev.off();

bargraph.CI(x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai[data_ai$feature_prior_strength==0.1,],legend=T,ylab='actions taken'); #, main='AI')
bargraph.CI(x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='actions taken'); #, main='AI')




median(data$train_time)
mean(data_ss$train_time[data_ss$train_time<1000*60*15])
mean(data_ss4$train_time[data_ss4$train_time<1000*60*15])


bargraph.CI(data=data[data$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time<150,legend=T,ylab='solution rate after 150 steps')
bargraph.CI(x.factor=pbp,response=train_time < 2499,ylim=c(0.0, 1.1),data=data_ai,legend=T,ylab='correct answer rate after 150 steps',main='AI');

bargraph.CI(data=data_ai[data_ai$found_solution==1 & data_ai$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='steps to solution for solved trials')
bargraph.CI(data=data_ai[data_ai$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='steps to solution for solved trials')

bargraph.CI(data=data_ss,x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),legend=T,ylab='correct answer rate')
bargraph.CI(data=data_ss[data_ss$found_solution==1 & data_ss$train_time<1000*60*5,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time/1000/60,legend=T,ylab='time in min')
bargraph.CI(data=data_ss[data_ss$found_solution==1 & data_ss$subject_pairs_seen<100,],x.factor=sch_cond,group=sim_cond_both_cat,response=subject_pairs_seen,legend=T,ylab='scene pairs')

bargraph.CI(data=data_ss4,x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),legend=T,ylab='correct answer rate')
bargraph.CI(data=data_ss4[data_ss4$found_solution==1 & data_ss4$train_time<1000*60*5,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time/1000/60,legend=T,ylab='time in min')


# idea: set an cut-off for step number at the median of the steps that the model took to solve a problem
# this should bring the number of solved problems closer to the human rate of ~ 50%
median_times = ddply(.data=data_ai, .variables=.(pbp), mean_acc = mean(found_solution), median_time = median(train_time), .fun=summarize);
get_pbp_median_time <- function(pbp) {
  return(median_times$median_time[median_times$pbp==pbp]);
}
get_capped_acc <- function(pbp) {
  return(median_times$median_time[median_times$pbp==pbp]);
}
data_ai$median_time = as.numeric(lapply(data_ai$pbp, get_pbp_median_time));
data_ai$capped_acc = ifelse(data_ai$train_time<data_ai$median_time, 1, 0);

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-acc-per-problem-median-cutoff-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=capped_acc,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='acc after median actions');
dev.off();

ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=capped_acc,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-acc-median-cutoff-by-cond-v0_7_0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'),x.leg=5.5,data=data_ai[data_ai$feature_prior_strength==100,],ylim=c(0,1.05),x.factor=sch_cond,group=sim_cond_both_cat,response=capped_acc,legend=T,ylab='acc. after median actions')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-actions-by-cond-v0_7_0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'),x.leg=5.5,ylim=c(400,1000), data=data_ai[data_ai$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='action count')
dev.off();

# other idea: just look at those problems where the model fits human data reasonably well
# in other words, exclude problems 13, 20, 26 and 31

pbps_good = c('2', '4', '8', '11b', '12', '16', '18', '22', '30');
data_ai_good = data_ai[data_ai$pbp %in% pbps_good,] # filter: only use pbps we also use in the machine learning case
data_ai_good$pbp = factor(data_ai_good$pbp, levels=c(pbps_good)) # reorder factor levels
data_ai_good = data_ai_good[order(data_ai_good$pbp),] # reorder columns according to the pbp factor
bargraph.CI(data=data_ai_good[data_ai_good$feature_prior_strength==100 & data_ai_good$found_solution==1,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='steps to solution or fail')
bargraph.CI(data=data_ai_good[data_ai_good$feature_prior_strength==100 & data_ai_good$found_solution==1,],x.factor=sch_cond,group=sim_cond_both_cat,response=capped_acc,legend=T,ylab='steps to solution or fail')
bargraph.CI(data=data_ai_good[data_ai_good$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='steps to solution for solved trials')
bargraph.CI(data=data_ai_good[data_ai_good$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=capped_acc,legend=T,ylab='steps to solution for solved trials')

bargraph.CI(data=data_ai[data_ai$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_bw_cat,response=train_time,legend=T,ylab='steps to solution for solved trials')

bargraph.CI(data=data_ai_good[data_ai_good$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='action count',density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'),x.leg=5.5)
bargraph.CI(data=data_ai[data_ai$feature_prior_strength==100&data_ai$found_solution==1,],x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,legend=T,ylab='action count for solved',density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'),x.leg=5.5)
bargraph.CI(data=data_ai[data_ai$feature_prior_strength==100,],x.factor=sch_cond,group=sim_cond_both_cat,response=1-capped_acc,legend=T,ylab='1-capped_acc',density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'),x.leg=5.5)

##### correlation of reaction times (... problem difficulty) #################################
# 1. we only look at correctly solved & at failed problems
# 2. we cut-off problem time at 6 minutes and at 1500 actions
# 3. we count problem all unsolved problems as requiring 6 minutes or 1500 actions
data_ai_1 = data_ai_feat_off_obj_on
data_ai_2 = data_ai_feat_off_obj_off
data_ai = data_ai_1;

data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10.0, pmin(10.0, data_ss_34$train_time/1000/60));
data_ai$difficulty = pmin(2500, data_ai$train_time);

mean(data_ss_34$difficulty[data_ss_34$pbp=='8'])

mean_ai = ddply(.data=data_ai, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ss = ddply(.data=data_ss_34, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ai_no_31 = ddply(.data=data_ai[data_ai$pbp != 31,], .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ss_no_31 = ddply(.data=data_ss_34[data_ss_34$pbp != 31,], .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);

#mean_ss<-data_ss_34 %>% group_by(pbp) %>% summarize(pbp=last(pbp), difficulty=mean(difficulty))
#mean_ai<-data_ai %>% group_by(pbp) %>% summarize(pbp=last(pbp), difficulty=mean(difficulty))

plot(mean_ai$difficulty, mean_ss$difficulty, xlab='model difficulty score', ylab='human difficulty score');
text(mean_ai$difficulty, mean_ss$difficulty, labels = mean_ai$pbp, pos = 4)
cor.test(mean_ai$difficulty, mean_ss$difficulty, method = "pearson", alternative = "two.sided")
cor.test(mean_ai_no_31$difficulty, mean_ss_no_31$difficulty, method = "pearson", alternative = "two.sided")
reg1 <- lm(mean_ss$difficulty~mean_ai$difficulty)
abline(reg1)

# plot difficulty score histogram
par(mfrow=c(2,1));
for (pbp in pbps) {
  hist(data_ss_34$difficulty[data_ss_34$pbp == pbp], breaks=c(0:31)/10, xlab='difficulty score', main=paste0('PBP ', pbp, ': subjects'));
  hist(data_ai$difficulty[data_ai$feature_prior_strength == 100 & data_ai$pbp == pbp], breaks=c(0:31)/10, xlab='difficulty', main=paste0('PBP ', pbp, ': model'));
}
par(mfrow=c(1,1));


# now do it again, but look at train time of solved trials directly

mean_solved_ai = ddply(.data=data_ai[data_ai$found_solution==1,], .variables=.(pbp), train_time=mean(train_time), .fun=summarize);
data_ss_34$train_time_10 = pmin(data_ss_34$train_time/1000/60,10);
mean_solved_ss = ddply(.data=data_ss_34[data_ss_34$found_solution==1,], .variables=.(pbp), train_time=mean(train_time_10), .fun=summarize);
mean_solved_ai_no_31 = ddply(.data=data_ai[data_ai$found_solution==1&data_ai$pbp != 31,], .variables=.(pbp), train_time=mean(train_time), .fun=summarize);
mean_solved_ss_no_31 = ddply(.data=data_ss_34[data_ss_34$found_solution==1&data_ss_34$pbp != 31,], .variables=.(pbp), train_time=mean(train_time_10), .fun=summarize);
plot(mean_solved_ai$train_time, mean_solved_ss$train_time, xlab='model solution time in actions', ylab='human solution time in minutes', ylim=c(0,2),xlim=c(0,1500));
text(mean_solved_ai$train_time, mean_solved_ss$train_time, labels = mean_solved_ai$pbp, pos = 4)
cor.test(mean_solved_ai$train_time, mean_solved_ss$train_time, method = "pearson", alternative = "two.sided")
cor.test(mean_solved_ai_no_31$train_time, mean_solved_ss_no_31$train_time, method = "pearson", alternative = "two.sided")
reg1 <- lm(mean_solved_ss$train_time~mean_solved_ai$train_time)
abline(reg1)

## new way of plotting that, but while showing the accuracy
# this import conflicts with the other ones at the top -- need to do them in the right order
library(tidyverse)
library(ggplot2)

byseveral<-group_by(data_ai[data_ai$found_solution == 1,], pbp)
mean_paths<-summarize(byseveral,timePaths=mean(train_time))
mean_paths

byseveral<-group_by(data_ss_34[data_ss_34$found_solution==1,],pbp)
mean_human<-summarize(byseveral,timeHuman=mean(train_time))
mean_human

combined<-merge(mean_paths,mean_human,all=TRUE)
combined$accHuman = 0
combined$accPaths = 0
for (pbp in pbps) {
  combined[combined$pbp == pbp, ]$accHuman = mean(data_ss_34[data_ss_34$pbp == pbp, ]$found_solution)
  combined[combined$pbp == pbp, ]$accPaths = mean(data_ai[data_ai$pbp == pbp, ]$found_solution)
}
combined$timeHuman10 <- pmin(combined$timeHuman/1000/60, 10);

ggplot(combined, aes(y=timeHuman10,x=timePaths)) +
  geom_point(aes(color=accPaths), alpha=1, size = 8) +
  geom_point(size = 5, color='white', alpha=0.5) +
  geom_point(aes(color=accHuman), alpha=1, size = 4.5) +
  ylab("human solution time in minutes")+xlab("model solution time in actions")+
  geom_abline(intercept = 0, slope = 1, color="red", size=0.5) +
  geom_text(aes(label=pbp), size=3.5) +
  guides(alpha = "none") +
  labs(colour='Accuracy') +
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


###########  Load the new sim vs dis data ########################

library(plyr) # conflicts with dplyr
library(sciplot)
library(ez)
#library(dplyr) # conflicts with plyr
rm(list=ls())  

setwd("~/Code/diss-model/new-analysis")
source("loading.r");
pbps <- c('pbp18sim', 'pbp18dis')
data_ai_18 = load_data(use_all=FALSE, filename="data-0-7-2-new18.csv", pbps)
data_ai_18 = annotate_data(data_ai_18)
for (pbp in pbps) {
  hgA <- hist(data_ai_18$train_time[data_ai_18$pbp == pbp & data_ai_18$sch_cond == 'interleaved'], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  hgB <- hist(data_ai_18$train_time[data_ai_18$pbp == pbp & data_ai_18$sch_cond == 'blocked'], breaks=c(0:100)*1000/12, xlim=c(0,2500), xlab='actions to solution in minutes', main=paste0('PBP ', pbp, ': model'));
  c1 <- rgb(0, 0, 255, max = 255, alpha = 125, names = "blue50")
  c2 <- rgb(255, 0, 0, max = 255, alpha = 125, names = "red50")
  plot(hgA, col = c1, xlim=c(0,2500), main=pbp, xlab="actions to solution")
  plot(hgB, col = c2, add=TRUE)
  legend("topright", legend=c("Interleaved", "Blocked"), fill=c(c1, c2), inset=.02, cex=0.8)
}
