library(plyr)
library(sciplot)
library(ez)
rm(list=ls())  

setwd("~/Code/diss/modelling/current/analysis")
source("loading.r");
data_ai = load_data();
data_ai = annotate_data(data_ai);
data_ai$population = 'ai';
data = data_ai;

setwd("~/Dropbox/Bongard Problems/pbp_mturk_exp3_2")
source("loading.r");
data_ss = load_data();
data_ss = annotate_data(data_ss);
data_ss$population = 'subjects';
data_ss$pbp = revalue(data_ss$pbp, c("2" = "pbp02", "4" = "pbp04", "8" = "pbp08", "11b" = "pbp11b", "12" = "pbp12", "13" = "pbp13", "16" = "pbp16", "18" = "pbp18", "20" = "pbp20", "22" = "pbp22", "26" = "pbp26", "31" = "pbp31"));
pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp31');
data_ss = data_ss[data_ss$pbp %in% pbps,] # filter: only use pbps we also use in the machine learning case
data_ss$pbp = factor(data_ss$pbp, levels=c(pbps)) # reorder factor levels
data_ss = data_ss[order(data_ss$pbp),] # reorder columns according to the pbp factor

data_all = merge(data_ai, data_ss[c("pbp", "cond", "found_solution", "train_time", "population")], all=T);
  
# print solutions ordered by frequency per problem:
pbp = 'pbp22';
sols = count(data[data$found_solution==1 & data$pbp==pbp,]$sol);
sols[order(sols$freq),]


####### VISUALIZE PER PROBLEM

bargraph.CI(x.factor=pbp,response=found_solution,ylim=c(0.0, 1.1),data=data_ai,legend=T,ylab='correct answer rate',main='AI');
bargraph.CI(x.factor=pbp,response=train_time,data=data_ai[data_ai$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='AI')

bargraph.CI(x.factor=pbp,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate', main='Subjects');
bargraph.CI(x.factor=pbp,response=train_time,data=data_ss[data_ss$found_solution == 1,],legend=T,ylab='steps to solution for solved trials', main='Subjects')

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

### all conds

bargraph.CI(x.factor=pbp,group=cond,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=pbp,group=cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=pbp,group=cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials')

### sch_cond

bargraph.CI(x.factor=pbp,group=sch_cond,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution for solved trials')

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

### all conds

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,data=data,legend=T,ylab='steps to solution or fail')

### sch_cond

bargraph.CI(x.factor=sch_cond,response=found_solution,ylim=c(0.6, 0.8),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=sch_cond,response=train_time,ylim=c(800,1100),data=data,legend=T,ylab='correct answer rate')

### sim_cond_wi_cat, sim_cond_bw_cat

bargraph.CI(x.factor=sim_cond_wi_cat,response=found_solution,ylim=c(0.6, 0.8),data=data,legend=T,ylab='correct answer rate', main='w/i similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=train_time,data=data,ylim=c(800,1100),legend=T,ylab='steps to solution or fail', main='w/i similarity')

bargraph.CI(x.factor=sim_cond_bw_cat,response=found_solution,ylim=c(0.6, 0.8),data=data,legend=T,ylab='correct answer rate', main='b/w similarity')
bargraph.CI(x.factor=sim_cond_bw_cat,response=train_time,data=data,ylim=c(800,1100),legend=T,ylab='steps to solution or fail', main='b/w similarity')


ezANOVA(data=data,dv=found_solution,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
