setwd("~/Code/diss/modelling/current/analysis")
library(plyr)
library(sciplot)
library(ez)
rm(list=ls())  

source("loading.r");
data = load_data();
data = annotate_data(data);

## accuracy plots #############################################

# scheduling condition
pdf(file="acc-by-sched.pdf",height=1.7, width=1.7, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,ylim=c(0.0, 1.0),data=data,legend=T,ylab='correct answer rate')#, main='scheduling condition')
dev.off();

bargraph.CI(x.factor=pbp,group=cond,response=found_solution,ylim=c(0.0, 1.2),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data,legend=T,ylab='steps to solution or fail')
bargraph.CI(x.factor=pbp,group=sch_cond,response=train_time,data=data[data$found_solution == 1,],legend=T,ylab='steps to solution')

bargraph.CI(x.factor=pbp,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.2),data=data[data$sch_cond=='interleaved',],legend=T,ylab='correct answer rate')#, main='scheduling condition')
bargraph.CI(x.factor=pbp,group=sim_cond_wi_cat,response=found_solution,ylim=c(0.0, 1.2),data=data[data$sch_cond=='interleaved',],legend=T,ylab='correct answer rate')#, main='scheduling condition')


bargraph.CI(x.factor=sch_cond,group=sim_cond_both_cat,response=found_solution,ylim=c(0.0, 1.2),data=data,legend=T,ylab='correct answer rate')
bargraph.CI(x.factor=sim_cond_wi_cat,response=found_solution,ylim=c(0.0, 1.2),data=data,legend=T,ylab='correct answer rate', main='w/i similarity')
bargraph.CI(x.factor=sim_cond_bw_cat,response=found_solution,ylim=c(0.0, 1.2),data=data,legend=T,ylab='correct answer rate', main='b/w similarity')

# scheduling condition and pair similarity
bargraph.CI(x.factor=sim_cond_pair,response=found_solution,ylim=c(0.0, 1.0),data=data,legend=T,ylab='correct answer rate', main='w/i-b/w pair similarity')
bargraph.CI(x.factor=sch_cond,response=found_solution,ylim=c(0.0, 1.0),data=data,group=sim_cond_pair,legend=T,ylab='correct answer rate', main='w/i-b/w pair similarity')
bargraph.CI(x.factor=sch_cond,response=found_solution,ylim=c(0.0, 1.0),group=sim_cond_wi_pair,data=data,legend=T,ylab='correct answer rate', main='within pair similarity')
bargraph.CI(x.factor=sch_cond,response=found_solution,ylim=c(0.0, 1.0),group=sim_cond_bw_pair,data=data,legend=T,ylab='correct answer rate',main='between pair similarity')

# category similarity
bargraph.CI(x.factor=fsims,response=found_solution,ylim=c(0.0, 1.0),data=data,legend=T,ylab='correct answer rate', main='w/i-b/w category similarity')
pdf(file="acc-by-bw-sim.pdf",height=1.7, width=1.7, pointsize=7)
par(mar=c(2,4,1,0)+0.2)
bargraph.CI(x.factor=sim_cond_bw_cat,response=found_solution,ylim=c(0.0, 1.0),names.arg=c('b/w dis','b/w sim'),data=data,legend=T,ylab='correct answer rate')#, main='between category similarity')
dev.off();
bargraph.CI(group=sim_cond_wi_cat,x.factor=sch_cond,response=found_solution,ylim=c(0.0, 1.0),data=data,legend=T,ylab='correct answer rate', main='within category similarity')

# scheduling condition and category similarity
pdf(file="acc-by-sims-per-sched.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,ylim=c(0.0, 1.0),data=data,group=sim_cond_both_cat,legend=T,ylab='correct answer rate')#, main='within-between category similarity')
dev.off()

pdf(file="acc-by-wi-sim-per-sched.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,leg.lab=c('w/i dis','w/i sim'),ylim=c(0.0, 1.0),data=data,group=sim_cond_wi_cat,legend=T,ylab='correct answer rate')#,main='within category similarity')
dev.off()

pdf(file="acc-by-bw-sim-per-sched.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=found_solution,leg.lab=c('b/w dis','b/w sim'),ylim=c(0.0, 1.0),data=data,group=sim_cond_bw_cat,legend=T,ylab='correct answer rate')#,main='between category similarity')
dev.off()

bargraph.CI(x.factor=fsims,response=found_solution,ylim=c(0.0, 1.0),data=data,group=sch_cond,legend=T,ylab='correct answer rate',main='w/i and b/w category similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=found_solution,ylim=c(0.0, 1.0),data=data[d$sim_cond_bw_cat=='dissimilar',],legend=T,group=sch_cond,ylab='correct answer rate',main='w/i cat. sim. for low b/w cat. sim.')
bargraph.CI(x.factor=sim_cond_bw_cat,response=found_solution,ylim=c(0.0, 1.0),data=data,group=sch_cond,legend=T,ylab='correct answer rate',main='between category similarity')

## repetition plots #############################################

bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,group=sim_cond_bw_cat,data=data[data$found_solution==1,],ylim=c(8,30),,legend.text=c('dissimilar', 'similar'),args.legend=list(title='b/w cat. sim.'),ylab='scene pairs seen')
ezANOVA(data=data[data$found_solution==1,],dv=subject_pairs_seen,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))

bargraph.CI(x.factor=sim_cond_bw_cat,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==1,],legend=T,ylab='scene pairs seen', main='between category similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==1,],legend=T,ylab='scene pairs seen', main='within category similarity')
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==1,],group=sim_cond_bw_cat,legend=T,ylab='scene pairs seen',main='between category similarity')


# interesting comparison: generally, people looked at less scene pairs for the problems that were solved (vs. the ones that weren't solved)
# however, for the blocked-low_bw_cat_sim conditions, which are really hard, people looked at more scene pairs for the problems that were solved
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==0,],group=sim_cond_both_cat,legend=T,ylab='scene pairs seen', main='unsolved problems')

pdf(file="reps-by-sims-per-sched.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==1,],group=sim_cond_both_cat,legend=T,ylab='scene pairs seen', main='solved problems')
dev.off()

ezDesign(data=data, x=cond, y=mturk_id)
ezDesign(data=data[data$found_solution==0,], x=cond, y=mturk_id)
ezDesign(data=data[data$found_solution==1,], x=cond, y=mturk_id)

bargraph.CI(x.factor=found_solution,response=subject_pairs_seen,ylim=c(8,30),names.arg=c('not solved', 'solved'),data=data,ylab='scene pairs seen')

bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==1,],group=sim_cond_wi_cat,legend=T,ylab='scene pairs seen', main='solved problems')
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution==1,],group=sim_cond_bw_cat,legend=T,ylab='scene pairs seen', main='solved problems')

res = ezMixed(
  data = data # or better use d?
  , dv = .(subject_pairs_seen)
  , random = .(mturk_id)
  , fixed = .(sim_cond_bw_cat, sim_cond_wi_cat, sch_cond)
  #, covariates = .(pbp_accuracy)
)
print(res$summary)

#aggregate by subject
d_id = ddply(.data=data, .variables=.(mturk_id)
             ,correct_answer_rate = mean(found_solution)
             ,subject_pairs_seen = mean(subject_pairs_seen)
             ,train_time = mean(train_time)/1000
             ,.fun=summarize)
plot(d_id$correct_answer_rate, d_id$subject_pairs_seen, xlab='proportion correct answers', ylab='scene pairs seen', main='per subject')
#aggregate by problem
d_pbp = ddply(.data=data, .variables=.(pbp)
              ,correct_answer_rate = mean(found_solution)
              ,subject_pairs_seen = mean(subject_pairs_seen)
              ,train_time = mean(train_time)/1000
              ,.fun=summarize)
plot(d_pbp$correct_answer_rate, d_pbp$subject_pairs_seen, xlab='proportion correct answers', ylab='scene pairs seen', main='per problem')

# only for solved problems
pdf(file="pairs-by-sims-per-sched-only-solved.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution == 1,],group=sim_cond_both_cat,legend=T,ylab='scene pairs seen')#, main='solved problems')
dev.off()

# for all
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data,group=sim_cond_both_cat,legend=T,ylab='scene pairs seen')
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution == 1,],group=sim_cond_both_cat,legend=T,ylab='scene pairs seen', main='only solved')
bargraph.CI(x.factor=sch_cond,response=subject_pairs_seen,ylim=c(8,30),data=data[data$found_solution != 1,],group=sim_cond_both_cat,legend=T,ylab='scene pairs seen', main='only unsolved')


## train time plots #############################################

bargraph.CI(x.factor=sch_cond,response=train_time,ylim=c(0,1200),data=data,legend=T,ylab='train time')
bargraph.CI(x.factor=sim_cond_bw_cat,response=train_time,ylim=c(0,1200),data=data,legend=T,ylab='train time', main='between category similarity')
bargraph.CI(x.factor=sim_cond_wi_cat,response=train_time,ylim=c(0,1200),data=data,legend=T,ylab='train time', main='within category similarity')
bargraph.CI(x.factor=sch_cond,response=train_time,ylim=c(0,1200),data=data,group=sim_cond_bw_cat,legend=T,ylab='train time',main='between category similarity')
bargraph.CI(x.factor=sch_cond,response=train_time,ylim=c(0,1200),data=data,group=sim_cond_wi_cat,legend=T,ylab='train time',main='between category similarity')


# interesting comparison: generally, people spent less time on the problems that were solved (vs. the ones that weren't solved)
# however, for the blocked-low_bw_cat_sim conditions, which are really hard, people spent more time on the problems that were solved
bargraph.CI(x.factor=sch_cond,response=train_time/1000,ylim=c(0,120),data=data[data$found_solution==0,],group=sim_cond_both_cat,legend=T,ylab='train time', main='unsolved problems')
bargraph.CI(x.factor=sch_cond,response=train_time/1000,ylim=c(0,120),data=data[data$found_solution==1,],group=sim_cond_both_cat,legend=T,ylab='train time', main='solved problems')
bargraph.CI(x.factor=found_solution,response=train_time,ylim=c(0,120),names.arg=c('not solved', 'solved'),data=data,ylab='train time')

# only for solved problems
pdf(file="time-by-sims-per-sched-only-solved.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=train_time/1000,ylim=c(0,120),data=data[data$found_solution == 1,],group=sim_cond_both_cat,legend=T,ylab='train time in seconds')#, main='solved problems')
dev.off()

## correct classifications plots ##################################

bargraph.CI(x.factor=sch_cond,response=num_correct,ylim=c(3,5),data=data,group=sim_cond_both_cat,legend=T,ylab='correct identifcations')#, main='within-between category similarity')


## consistency plots #############################################

bargraph.CI(x.factor=sch_cond,response=consistency,data=d,ylim=c(0,3),legend=T,ylab='consistency')
bargraph.CI(x.factor=sim_cond_bw_cat,response=consistency,ylim=c(0,3),data=d,legend=T,ylab='consistency', main='between category similarity')
bargraph.CI(x.factor=sch_cond,response=consistency,ylim=c(0,3),data=d,group=sim_cond_bw_cat,legend=T,ylab='consistency',main='between category similarity')
bargraph.CI(x.factor=sch_cond,response=consistency,ylim=c(0,3),data=d,group=sim_cond_wi_cat,legend=T,ylab='consistency',main='within category similarity')

pdf(file="consistency-by-sims-per-sched.pdf",height=1.7, width=2.8, pointsize=7)
par(mar=c(2,4,1,0.5)+0.2)
bargraph.CI(x.factor=sch_cond,response=consistency,ylim=c(0.5, 2.5),data=data,group=sim_cond_both_cat,legend=T,ylab='consistency')#, main='within-between category similarity')
dev.off()
bargraph.CI(x.factor=sch_cond,response=num_correct,ylim=c(2.5, 6),data=data,group=sim_cond_both_cat,legend=T,ylab='consistency')#, main='within-between category similarity')
ezANOVA(data=data,dv=num_correct,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))


ezANOVA(data=data,dv=found_solution,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=consistency,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=found_solution,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat),within_covariates=pbp_accuracy)
# ^-- use this
ezANOVA(data=data,dv=subject_pairs_seen,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat),within_covariates=pbp_accuracy)
ezANOVA(data=data,dv=subject_pairs_seen,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=train_time,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=consistency,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))
ezANOVA(data=data,dv=num_correct,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat))


ezANOVA(data=data,dv=subject_pairs_seen,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat));
ezANOVA(data=data[data$found_solution==1,],dv=subject_pairs_seen,wid=mturk_id,within=.(sch_cond,sim_cond_wi_cat,sim_cond_bw_cat));
