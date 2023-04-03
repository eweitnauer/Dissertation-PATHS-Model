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

