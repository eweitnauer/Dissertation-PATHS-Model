library(plyr)
library(sciplot)
library(ez)
library(effsize)
rm(list=ls())  

setwd("~/Code/diss/modelling/current/analysis")
source("loading.r");
data_cx = load_data(use_all=FALSE, filename="data-0-7-0-complexity-all.csv");
data_cx = annotate_data(data_cx);


setwd("~/Code/diss/modelling/current/analysis")
source("loading.r");
data_ai = load_data(use_all=FALSE);
data_ai = annotate_data(data_ai);
data_ai_all = load_data(use_all=TRUE);
data_ai_all = annotate_data(data_ai_all);
data_ai$population = 'ai';
data = data_ai;

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
  
# print solutions ordered by frequency per problem:
pbp = '26';
sols = count(data_ai_all[data_ai_all$found_solution==1 & data_ai_all$pbp==pbp,]$sol);
sols[order(sols$freq),]


### Historgrams of time to solution #######################################################################

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

data_ai$difficulty = pmin(2500, data_ai$train_time);
data_ai$log_difficulty = log(data_ai$difficulty)
cohen.d(data_ai$log_difficulty[data_ai$feature_prior_strength == 100 & data_ai$sch_cond=='interleaved' & data_ai$sim_cond_bw_cat=='dis. b/w cat.']
      , data_ai$log_difficulty[data_ai$feature_prior_strength == 100 & data_ai$sch_cond=='interleaved' & data_ai$sim_cond_bw_cat=='sim. b/w cat.']);
cohen.d(data_ai$log_difficulty[data_ai$feature_prior_strength == 100 & data_ai$sch_cond=='blocked' & data_ai$sim_cond_wi_cat=='sim. w/i cat.']
      , data_ai$log_difficulty[data_ai$feature_prior_strength == 100 & data_ai$sch_cond=='blocked' & data_ai$sim_cond_wi_cat=='dis. w/i cat.']);


data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10*1000*60, pmin(10*1000*60, data_ss_34$train_time));
data_ss_34$log_difficulty = log(data_ss_34$difficulty);
cohen.d(data_ss_34$log_difficulty[data_ss_34$sch_cond=='interleaved' & data_ss_34$sim_cond_bw_cat=='dissimilar across categories']
      , data_ss_34$log_difficulty[data_ss_34$sch_cond=='interleaved' & data_ss_34$sim_cond_bw_cat=='similar across categories']);
cohen.d(data_ss_34$log_difficulty[data_ss_34$sch_cond=='simultaneous' & data_ss_34$sim_cond_wi_cat=='similar within categories']
      , data_ss_34$log_difficulty[data_ss_34$sch_cond=='simultaneous' & data_ss_34$sim_cond_wi_cat=='dissimilar within categories']);

### train-time per condition #############################################################################

# AI

# actions
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-actions-by-cond-v0_7_0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time,ylim=c(500,1000),data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='actions', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

# log actions
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-log-actions-by-cond-v0_7_0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=log(train_time),ylim=c(5,6.5),data=data_ai[data_ai$feature_prior_strength==100&data_ai$found_solution==1,],legend=T,ylab='log actions for successful trials', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

# log difficulty
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-log-difficulty-by-cond-v0_7_0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=log(difficulty),ylim=c(5,6.5),data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='model log difficulty score', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

data_ai$log_train_time = log(data_ai$train_time)
data_ai$log_difficulty = log(data_ai$difficulty)
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100&data_ai$found_solution==1,],dv=log_train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=log_difficulty,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=log_difficulty,wid=mturk_id,within=.(sch_cond,sim_cond_wi_pair))

# SS

# accuracy
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-acc-by-cond.pdf",height=1.8, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,data=data_ss_34[data_ss_34$train_time < 1000*60*10,], ylim=c(0,1.05), legend=T, ylab='solution rate', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'))
#bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=subject_pairs_seen,data=data_ss[data_ss$subject_pairs_seen<100,],legend=T,ylab='actions', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

# time in minutes
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-time-by-cond.pdf",height=1.8, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=train_time/1000/60,data=data_ss_34[data_ss_34$train_time < 1000*60*10,], ylim=c(0,1.8), legend=T, ylab='time in minutes', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'))
#bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=subject_pairs_seen,data=data_ss[data_ss$subject_pairs_seen<100,],legend=T,ylab='actions', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

############# CORRECT COLORS HERE #####################
# log time minutes
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-log-time-by-cond.pdf",height=1.8, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,ylim=c(10,11.5),response=log(train_time),data=data_ss_34[data_ss_34$train_time < 1000*60*10,],legend=T,ylab='log (time in ms)', density=c(25,25,-1,-1),angle=c(45),col=c('#E89696','#325D81', '#F6D5D5','#5A91BF'))
#bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=log(subject_pairs_seen),data=data_ss[data_ss$subject_pairs_seen<100,],legend=T,ylab='actions', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

# log time minutes for solved trials
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-log-time-by-cond-for-solved.pdf",height=1.8, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,ylim=c(10,14),response=log(train_time),data=data_ss_34[data_ss_34$train_time < 1000*60*10 & data_ss_34$found_solution==1,],legend=T,ylab='log (time in ms) for solved trials', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'))
#bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=log(subject_pairs_seen),data=data_ss[data_ss$subject_pairs_seen<100,],legend=T,ylab='actions', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'), x.leg=5.5)
dev.off();

# difficulty
data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10.0*1000*60, pmin(10.0*1000*60, data_ss_34$train_time));
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-log-difficulty-by-cond.pdf",height=1.8, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,ylim=c(10,14),response=log(difficulty),data=data_ss_34[data_ss_34$train_time < 1000*60*10,],legend=T,ylab='human log difficulty score', density=c(25,25,-1,-1),angle=c(45),col=c('#D74B4B','#4682B4', '#e58b8b', '#99bbd7'))
dev.off();

## ezMIXED analysis

data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10.0*1000*60, pmin(10.0*1000*60, data_ss_34$train_time));
data_ss_34$log_train_time = log(data_ss_34$train_time)
data_ss_34$log_difficulty = log(data_ss_34$difficulty)
data_ss$difficulty = ifelse(data_ss$found_solution == 0, 10.0*1000*60, pmin(10.0*1000*60, data_ss$train_time));
data_ss$log_train_time = log(data_ss$train_time)
data_ss$log_difficulty = log(data_ss$difficulty)
data_ss4$difficulty = ifelse(data_ss4$found_solution == 0, 10.0*1000*60, pmin(10.0*1000*60, data_ss4$train_time));
data_ss4$log_train_time = log(data_ss4$train_time)
data_ss4$log_difficulty = log(data_ss4$difficulty)
data_ss4_ab$difficulty = ifelse(data_ss4_ab$found_solution == 0, 10.0*1000*60, pmin(10.0*1000*60, data_ss4_ab$train_time));
data_ss4_ab$log_train_time = log(data_ss4_ab$train_time)
data_ss4_ab$log_difficulty = log(data_ss4_ab$difficulty)

# log RT ss3
res = ezMixed(data = data_ss[data_ss$train_time < 1000*60*10 & data_ss$found_solution == 1,], dv = .(log_train_time), random = .(mturk_id), fixed = .(sim_cond_bw_cat, sim_cond_wi_cat, sch_cond))
print(res$summary)

data_ss$log_sps = log(data_ss$subject_pairs_seen);
res = ezMixed(data = data_ss[data_ss$train_time < 1000*60*10 & data_ss$found_solution == 1,], dv = .(log_sps), random = .(mturk_id), fixed = .(sim_cond_bw_cat, sim_cond_wi_cat, sch_cond))
print(res$summary)

# log RT ss4
res = ezMixed(data = data_ss4[data_ss4$train_time < 1000*60*10 & data_ss4$found_solution ==1 & data_ss4$sch_cond == 'simultaneous',], dv = .(log_train_time), random = .(mturk_id), fixed = .(sim_cond_bw_cat, sim_cond_wi_cat, sch_cond))
print(res$summary)

# log difficulty ss3
res = ezMixed(data = data_ss[data_ss$train_time < 1000*60*10,], dv = .(log_difficulty), random = .(mturk_id), fixed = .(sim_cond_bw_cat, sim_cond_wi_cat, sch_cond))
print(res$summary)

# log difficulty ss4
res = ezMixed(data = data_ss4[data_ss4$train_time < 1000*60*10 & data_ss4$sch_cond == 'simultaneous',], dv = .(log_difficulty), random = .(mturk_id), fixed = .(sim_cond_bw_cat, sim_cond_wi_cat, sch_cond))
print(res$summary)


### train time per b/w and w/i similarity

data_ai$log_train_time = log(data_ai$train_time)
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-log-time-by-bw-sim-per-sched-v0.7.0.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=log_train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='log actions', ylim=c(5,6.5)); #, main='AI b/w similarity')
dev.off();

data_ai$log_train_time = log(data_ai$train_time)
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-log-time-by-wi-sim-per-sched-v0.7.0.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=log_train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='log actions', ylim=c(5,6.5)); #, main='AI b/w similarity')
dev.off();

data_ai$difficulty = pmin(10.0, data_ai$train_time/250);
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-difficulty-by-wi-sim-per-sched-v0.7.0.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=difficulty,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='difficulty', ylim=c(2,4)); #, main='AI b/w similarity')
dev.off();

data_ai$difficulty = pmin(10.0, data_ai$train_time/250);
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-difficulty-by-bw-sim-per-sched-v0.7.0.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=difficulty,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='difficulty', ylim=c(2,4)); #, main='AI b/w similarity')
dev.off();

data_ai$log_train_time = log(data_ai$train_time)
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-difficulty-by-wi-sim-per-sched-v0.7.0.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond, group=sim_cond_wi_cat,response=log_train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='log actions', ylim=c(5,6.5)); #, main='AI b/w similarity')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-acc-by-bw-sim-per-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_bw_cat,data=data_ss_34,legend=T,ylab='solution rate', ylim=c(0.2,0.8));#, main='Subjects b/w similarity')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-acc-by-wi-sim-per-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_wi_cat,data=data_ss_34,legend=T,ylab='solution rate', ylim=c(0.2,0.8));#, main='Subjects b/w similarity')
dev.off();

data_ss_34$log_train_time = log(data_ss_34$train_time)
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-logtime-by-bw-sim-per-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=log_train_time,group=sim_cond_bw_cat,data=data_ss_34[data_ss_34$train_time<1000*60*10 & data_ss_34$found_solution==1,],legend=T,ylab='log time for solved trials', ylim=c(10,12));#, main='Subjects b/w similarity')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-logtime-by-wi-sim-per-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=log_train_time,group=sim_cond_wi_cat,data=data_ss_34[data_ss_34$train_time<1000*60*10 & data_ss_34$found_solution==1,],legend=T,ylab='log time for solved trials', ylim=c(10,12));#, main='Subjects b/w similarity')
dev.off();

data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10.0*1000*60, pmin(10.0*1000*60, data_ss_34$train_time));#/1000/60));
data_ss_34$log_difficulty = ifelse(data_ss_34$found_solution == 0, log(10.0*60*1000), log(pmin(10.0*60000, data_ss_34$train_time)));
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-difficulty-by-bw-sim-per-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=difficulty,group=sim_cond_bw_cat,data=data_ss_34[data_ss_34$train_time<1000*60*10,],legend=T,ylab='difficulty score', ylim=c(0,10));#, main='Subjects b/w similarity')
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-difficulty-by-wi-sim-per-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=difficulty,group=sim_cond_wi_cat,data=data_ss_34[data_ss_34$train_time<1000*60*10,],legend=T,ylab='difficulty score', ylim=c(0,10));#, main='Subjects b/w similarity')
dev.off();

### problem time / difficulty correlation #################################################################

# 1. we only look at correctly solved & at failed problems
# 2. we cut-off problem time at 10 minutes (and at 2500 actions)
# 3. we count problem all unsolved problems as requiring 10 minutes (or 2500 actions)
# 4. problem 31 is a major outlier, so we calculate the correlation & regression line without it

data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10.0, pmin(10.0, data_ss_34$train_time/1000/60));
data_ai$difficulty = pmin(2500, data_ai$train_time);
mean_ai = ddply(.data=data_ai, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ss = ddply(.data=data_ss_34, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ai_no_31 = ddply(.data=data_ai[data_ai$pbp != 31,], .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ss_no_31 = ddply(.data=data_ss_34[data_ss_34$pbp != 31,], .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="problem-difficulty-correlation.pdf",height=2.5, width=4, pointsize=7)
par(mar=c(2+2,4,1,0)+0.2)
plot(mean_ai$difficulty, mean_ss$difficulty, xlab='model difficulty score', ylab='human difficulty score');
reg1 <- lm(mean_ss_no_31$difficulty~mean_ai_no_31$difficulty)
abline(reg1, col='gray')
text(mean_ai$difficulty, mean_ss$difficulty, labels = mean_ai$pbp, pos = c(4,4,4,4,4,4,4,4,1,4,4,4,3))
dev.off();

cor.test(mean_ai$difficulty, mean_ss$difficulty, method = "pearson", alternative = "two.sided")
cor.test(mean_ai_no_31$difficulty, mean_ss_no_31$difficulty, method = "pearson", alternative = "two.sided")

# now do it again, but look at train time of SOLVED trials

mean_solved_ai = ddply(.data=data_ai[data_ai$found_solution==1,], .variables=.(pbp), train_time=mean(train_time), .fun=summarize);
mean_solved_ss = ddply(.data=data_ss_34[data_ss_34$found_solution==1&data_ss_34$train_time<10*1000*60,], .variables=.(pbp), train_time=mean(train_time/1000/60), .fun=summarize);

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="problem-time-correlation.pdf",height=2.5, width=4, pointsize=7)
par(mar=c(2+2,4,1,0)+0.2)
plot(mean_solved_ai$train_time, mean_solved_ss$train_time, xlab='model actions to solution', ylab='human time to solution in minutes', ylim=c(0,2),xlim=c(0,1500));
reg1 <- lm(mean_solved_ss$train_time~mean_solved_ai$train_time)
abline(reg1, col='gray')
text(mean_solved_ai$train_time, mean_solved_ss$train_time, labels = mean_solved_ai$pbp, pos = 4)
dev.off();

cor.test(mean_solved_ai$train_time, mean_solved_ss$train_time, method = "pearson", alternative = "two.sided")


### performance per problem ##############################################################################################

### AI performance per problem

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-acc-per-problem-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ai_all[data_ai_all$feature_prior_strength == 100,],legend=T,ylab='correct answer rate'); #, main='AI')
dev.off();

# complexity plots

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-acc-per-feature-count-v0-7-0.pdf",height=1.8, width=6, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=feature_count,ylim=c(0,1.05),response=found_solution,data=data_cx,legend=T,ylab='correct answer rate',xlab='number of features the model can perceive');
dev.off();

#bargraph.CI(x.factor=feature_count,response=train_time,data=data_cx[data_cx$found_solution == 1,],legend=T,ylab='number of actions for solved');
#bargraph.CI(x.factor=feature_count,response=train_time,data=data_cx,legend=T,ylab='number of actions all');

d_cx = ddply(.data=data_cx, .variables=.(feature_count), perc_avg = mean(perception_count), perc_sdev = sd(perception_count), time_avg = mean(train_time), time_sdev = sd(train_time), time_se = se(train_time), .fun=summarize);
#d_cx = ddply(.data=data_cx[data_cx$found_solution == 1,], .variables=.(feature_count), time_avg = mean(train_time), time_sdev = sd(train_time), time_se = se(train_time), .fun=summarize);

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-difficulty-per-feature-count-v0-7-0.pdf",height=2.2, width=6, pointsize=7)
par(mar=c(4,4,1,0)+0.2)
x = d_cx$feature_count;
avg = d_cx$time_avg;
sdev = d_cx$time_sdev;
#avg = d_cx$perc_avg;
#sdev = d_cx$perc_sdev;
plot(x, avg, xaxt="n",
     ylim=range(c(0, avg+sdev+100)),
     pch=19, xlab="number of features the model can perceive", ylab="difficulty score"
)
axis(side=1, at=seq(3,34,1))
# hack: we draw arrows but with very special "arrowheads"
arrows(x, avg-sdev, x, avg+sdev, length=0.05, angle=90, code=3)
dev.off();


setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-actions-per-problem-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(col='gray',x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai_all[data_ai_all$feature_prior_strength == 100,],legend=T,ylab='actions taken');
par(new=TRUE)
bargraph.CI(col=rgb(70/255,130/255,180/255,alpha=0.5),x.factor=pbp,ylim=c(0,2500),response=train_time,data=data_ai_all[data_ai_all$feature_prior_strength == 100 & data_ai_all$found_solution == 1,], legend=F, axes=false, names.arg=FALSE);
dev.off();

# perception and retrieval count
# use this to plot standard derivation instead of standard error interval: ci.fun= function(x) c(mean(x)-sd(x), mean(x)+sd(x))
bargraph.CI(x.factor=pbp,response=retrieval_count,data=data_ai_all[data_ai_all$feature_prior_strength == 100,],legend=T,ylab='perceptions');

data_ai_all$max_perc = 0;
data_ai_all$max_perc[data_ai_all$pbp==2] = 1312;
data_ai_all$max_perc[data_ai_all$pbp==4] = 2272;
data_ai_all$max_perc[data_ai_all$pbp==8] = 1492;
data_ai_all$max_perc[data_ai_all$pbp=='11b'] = 2632;
data_ai_all$max_perc[data_ai_all$pbp==12] = 2032;
data_ai_all$max_perc[data_ai_all$pbp==13] = 5624;
data_ai_all$max_perc[data_ai_all$pbp==16] = 2032;
data_ai_all$max_perc[data_ai_all$pbp==18] = 2632;
data_ai_all$max_perc[data_ai_all$pbp==20] = 3828;
data_ai_all$max_perc[data_ai_all$pbp==22] = 2032;
data_ai_all$max_perc[data_ai_all$pbp==26] = 16464;
data_ai_all$max_perc[data_ai_all$pbp==30] = 1312;
data_ai_all$max_perc[data_ai_all$pbp==31] = 3528;
data_ai_all$max_perc[data_ai_all$pbp==35] = 3052;
data_ai_all$max_perc[data_ai_all$pbp==36] = 3528;

data_ai_perc = ddply(data_ai_all[data_ai_all$feature_prior_strength == 100,], c('pbp'), summarize, perc=mean(perception_count)/mean(max_perc));
bargraph.CI(fun=mean,col=rgb(70/255,130/255,180/255,alpha=0.5),x.factor=pbp,response=perception_count,data=data_ai_all[data_ai_all$feature_prior_strength == 100,],legend=T,ylab='perceptions');

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-perceived-features-v0-7-0.pdf",height=3, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,17000),response=max_perc,data=data_ai_all[data_ai_all$feature_prior_strength == 100,],legend=T,ylab='perceptions');
par(new=TRUE)
bargraph.CI(fun=mean,col=rgb(70/255,130/255,180/255,alpha=0.5),x.factor=pbp,ylim=c(0,17000),response=perception_count,data=data_ai_all[data_ai_all$feature_prior_strength == 100,],legend=T,ylab='perceptions');
dev.off();

bargraph.CI(x.factor=pbp,ylim=c(0,17000),response=max_perc,data=data_ai_all[data_ai_all$feature_prior_strength == 100 & data_ai_all$found_solution==1,],legend=T,ylab='perceptions');
par(new=TRUE)
bargraph.CI(fun=mean,col=rgb(70/255,130/255,180/255,alpha=0.5),x.factor=pbp,ylim=c(0,17000),response=perception_count,data=data_ai_all[data_ai_all$feature_prior_strength == 100 & data_ai_all$found_solution==1,],legend=T,ylab='perceptions');

### Subject performance per problem

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-acc-per-problem.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
#bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ss,legend=T,ylab='correct answer rate');
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ss_34,legend=T,ylab='correct answer rate');
par(new=TRUE)
bargraph.CI(col=rgb(70/255,130/255,180/255,alpha=0.5),x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ss4,legend=T,ylab='correct answer rate');
dev.off();

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS34-time-per-problem.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,5),response=train_time/1000/60,data=data_ss_34[data_ss_34$train_time < 1000*60*10,],legend=T,ylab='time');
par(new=TRUE)
bargraph.CI(col=rgb(70/255,130/255,180/255,alpha=0.5),x.factor=pbp,ylim=c(0,5),response=train_time/1000/60,data=data_ss_34[data_ss_34$train_time < 1000*60*10 & data_ss_34$found_solution == 1,], legend=F, names.arg=FALSE);
dev.off();






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
ezANOVA(data=data_ai[data_ai$feature_prior_strength==100,],dv=log_train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
data_ai$inv_train_time = 1/data_ai$train_time
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
bargraph.CI(x.factor=sch_cond, group=sim_cond_bw_cat,response=log_train_time,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='actions to solution or fail', ylim=c(5,6.5)); #, main='AI b/w similarity')
dev.off();

data_ai$log_train_time = log(data_ai$train_time)
data_ss_34$log_train_time = log(data_ss_34$train_time)
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS3-bw-sim-by-sched.pdf",height=1.7, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,group=sim_cond_bw_cat,data=data_ss_34,legend=T,ylab='solution rate', ylim=c(0.2,0.8));#, main='Subjects b/w similarity')
#bargraph.CI(x.factor=sch_cond,response=train_time,group=sim_cond_bw_cat,data=data_ss_34[data_ss_34$train_time<1000*60*10,],legend=T,ylab='time');#, main='Subjects b/w similarity')
#bargraph.CI(x.factor=sch_cond,response=log_train_time,group=sim_cond_bw_cat,data=data_ss_34[data_ss_34$train_time<1000*60*10,],legend=T,ylab='log time', ylim=c(10,12));#, main='Subjects b/w similarity')
dev.off();

### FINAL PLOTS FOR COGSCI 2015 ###########################

## w/i PAIR similarity for AI
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-log-difficulty-by-wi-pair-sim-v0.7.0.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
#bargraph.CI(x.factor=sch_cond,response=train_time,group=sim_cond_wi_pair,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylab='actions taken', ylim=c(500,1000), x.leg=3.6, y.leg=1200);
bargraph.CI(x.factor=sch_cond,response=log(difficulty),group=sim_cond_wi_pair,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylim=c(5,6.4),ylab='model log difficulty', x.leg=3.6);
dev.off();

bargraph.CI(x.factor=sch_cond,response=log(difficulty),group=sim_cond_bw_cat,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylim=c(5,6.4),ylab='model log difficulty', x.leg=3.6);
bargraph.CI(x.factor=sch_cond,response=log(difficulty),group=sim_cond_wi_cat,data=data_ai[data_ai$feature_prior_strength==100,],legend=T,ylim=c(5,6.4),ylab='model log difficulty', x.leg=3.6);

## w/i PAIR similarity for Ss3 #OK
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS3-log-difficulty-by-wi-pair-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
#bargraph.CI(x.factor=sch_cond,response=1-found_solution,group=sim_cond_wi_pair,data=data_ss,legend=T,ylab='error rate', ylim=c(0,1.01), x.leg=3.6);
bargraph.CI(x.factor=sch_cond,response=log(difficulty),group=sim_cond_wi_pair,data=data_ss,legend=T,ylab='human log difficulty score', ylim=c(10, 14), x.leg=3.6);
dev.off();

## w/i category similarity for Ss4 #OK
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS4-log-difficulty-by-wi-cat-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
#bargraph.CI(group=sim_cond_wi_cat,x.factor=flag,response=1-found_solution,data=data_ss4_ab,legend=T,ylab='error rate', ylim=c(0,1.01), x.leg=1);
bargraph.CI(group=sim_cond_wi_cat,x.factor=flag,response=log_difficulty,data=data_ss4_ab,legend=T,ylab='human log difficulty score', ylim=c(10,14), x.leg=1);
dev.off();
setwd("~/Code/diss/modelling/current/analysis")
pdf(file="SS4-log-difficulty-by-bw-cat-sim.pdf",height=1.8, width=3.4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
#bargraph.CI(x.factor=flag, group=sim_cond_bw_cat,response=1-found_solution,data=data_ss4_ab,legend=T,ylab='error rate', ylim=c(0,1.01), x.leg=0.85);
bargraph.CI(x.factor=flag, group=sim_cond_bw_cat,response=log_difficulty,data=data_ss4_ab,legend=T,ylab='human log difficulty score', ylim=c(10,14), x.leg=0.85);
dev.off();


## AI performance per problem

setwd("~/Code/diss/modelling/current/analysis")
pdf(file="AI-acc-per-problem-v0-7-0.pdf",height=1.2, width=4, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=pbp,ylim=c(0,1.05),response=found_solution,data=data_ai[data_ai$feature_prior_strength == 100,],legend=T,ylab='correct answer rate'); #, main='AI')
dev.off();

bargraph.CI(x.factor=pbp,ylim=c(0,1.05),group=cond,response=found_solution,data=data_ai[data_ai$feature_prior_strength == 100,],legend=T,ylab='correct answer rate'); #, main='AI')

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

data_ss_34$difficulty = ifelse(data_ss_34$found_solution == 0, 10.0, pmin(10.0, data_ss_34$train_time/1000/60));
data_ai$difficulty = pmin(10.0, data_ai$train_time/250);
mean_ai = ddply(.data=data_ai, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ss = ddply(.data=data_ss_34, .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ai_no_31 = ddply(.data=data_ai[data_ai$pbp != 31,], .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
mean_ss_no_31 = ddply(.data=data_ss_34[data_ss_34$pbp != 31,], .variables=.(pbp), acc = mean(found_solution), difficulty = mean(difficulty), train_time=mean(train_time), .fun=summarize);
plot(mean_ai$difficulty, mean_ss$difficulty, xlab='model difficulty score', ylab='human difficulty score');
text(mean_ai$difficulty, mean_ss$difficulty, labels = mean_ai$pbp, pos = 4)
cor.test(mean_ai$difficulty, mean_ss$difficulty, method = "pearson", alternative = "two.sided")
cor.test(mean_ai_no_31$difficulty, mean_ss_no_31$difficulty, method = "pearson", alternative = "two.sided")
reg1 <- lm(mean_ss_no_31$difficulty~mean_ai_no_31$difficulty)
abline(reg1)

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
