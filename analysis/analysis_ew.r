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

setwd("~/Dropbox/Bongard Problems/pbp_mturk_exp4")
source("loading.r");
data_ss4 = load_data();
data_ss4 = annotate_data(data_ss4);
data_ss4$population = 'subjects';
data_ss4$pbp = revalue(data_ss4$pbp, c("2" = "pbp02", "4" = "pbp04", "8" = "pbp08", "11b" = "pbp11b", "12" = "pbp12", "13" = "pbp13", "16" = "pbp16", "18" = "pbp18", "20" = "pbp20", "22" = "pbp22", "26" = "pbp26", "31" = "pbp31"));
pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp31');
data_ss4 = data_ss4[data_ss4$pbp %in% pbps,] # filter: only use pbps we also use in the machine learning case
data_ss4$pbp = factor(data_ss4$pbp, levels=c(pbps)) # reorder factor levels
data_ss4 = data_ss4[order(data_ss4$pbp),] # reorder columns according to the pbp factor
data_ss4_a = data_ss4;
data_ss4_a$flag = ' keep me';
data_ss4_b = data_ss4;
data_ss4_b$flag = 'delete me (I\'m identical)';
data_ss4_ab = merge(data_ss4_a, data_ss4_b, all=T);

data_all = merge(data_ai, data_ss[c("pbp", "cond", "found_solution", "train_time", "population")], all=T);
  
# print solutions ordered by frequency per problem:
pbp = 'pbp36';
sols = count(data[data$found_solution==1 & data$pbp==pbp,]$sol);
sols[order(sols$freq),]


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

### all conds Ss

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.1),data=data_ss,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,data=data_ss,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,data=data_ss[data_ss$found_solution==1,],legend=T,ylab='steps to solution for solved trials')
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

ezANOVA(data=data,dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_pair,sim_cond_bw_pair))


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

bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,ylim=c(600,1200),data=data,legend=T,ylab='actions taken')

### USE w/i sim. per schedule

#bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=train_time,data=data[data$found_solution==1,],legend=T,ylab='steps to solution for solved trials', main='AI w/i similarity')
#bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_wi_cat,data=data_ss,legend=T,ylab='acc', main='Subjects w/i similarity')

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-wi-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=train_time,data=data,legend=T,ylab='steps to solution or fail', ylim=c(600,1200)); #, main='AI w/i similarity'
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
pdf(file="AI-bw-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=train_time,data=data,legend=T,ylab='steps to solution or fail', ylim=c(600,1200)); #, main='AI b/w similarity')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS3-bw-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=1-found_solution,group=sim_cond_bw_cat,data=data_ss,legend=T,ylab='wrong/no answer rate', ylim=c(0.2,0.8));#, main='Subjects b/w similarity')
dev.off();


### FINAL PLOTS ###########################

## w/i PAIR similarity for AI
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-steps-by-wi-pair-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=train_time,group=sim_cond_wi_pair,data=data_ai,legend=T,ylab='action taken', ylim=c(600,1200), x.leg=3.6, y.leg=1200);
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
pdf(file="AI-acc-per-problem.pdf",height=1.0, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ai,legend=T,ylab='correct answer rate'); #, main='AI')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-steps-per-problem.pdf",height=1.0, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai,legend=T,ylab='actions taken'); #, main='AI')
dev.off();

