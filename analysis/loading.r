# import data for algorithmic data

# renames the following columns: mturk_id (rep), found_solution (solved), cond (pres_mode), train_time (steps)
load_data = function() {
  #data = read.csv("pbp-computer-results.csv", header=TRUE, colClasses=c("steps"="numeric"));
  data = read.csv("data-0-5-2.csv", header=TRUE, colClasses=c("steps"="numeric"));
  data = rename(data, c("solved"="found_solution","pres_mode"="cond","steps"="train_time","rep"="mturk_id"));
  data$found_solution = ifelse((data$found_solution == 'true') | (data$found_solution == 1), 1, 0);
  
  # for now, don't use problems PBP35 and PBP36
  pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp31');
  data = data[data$pbp %in% pbps,]
  
  print("subjects total:")
  print(length(table(data$mturk_id)))
  print("% problems solved:");
  print(100 * sum(data$found_solution) / length(data$found_solution));
  
  return(data)
}

# Adds new condition columns sch_cond, sim_cond_wi_cat, sim_cond_bw_cat and sim_cond_both_cat.
# Adds columns for the number of correctly classified test scenes "num_correct", a column for the "consistency"
# measure, corrects the train_time and adds a column "pbp_accuracy" that holds the proportion of people that solved
# each of the 22 pbps for each pbp.
annotate_data = function(data) {
  #create new conditions, to separate each factor (sim and schedule)
  data$sch_cond = ifelse(data$cond %in% c('blocked-dis-dis','blocked-sim-sim','blocked-dis-sim','blocked-sim-dis'),'blocked','interleaved')
  
  # are the comparisons within one category done on similar or dissimilar elements?
  data$sim_cond_wi_cat  = ifelse(data$cond %in% c('blocked-dis-sim','interleaved-dis-sim','interleaved-dis-dis','blocked-dis-dis'),'dissimilar','similar')
  data$sim_cond_bw_cat = ifelse(data$cond %in% c('blocked-dis-sim','interleaved-dis-sim','interleaved-sim-sim','blocked-sim-sim'),'similar','dissimilar')
  
  # this line is *much* faster than the loop below
  data$sim_cond_both_cat = interaction(data$sim_cond_wi_cat, data$sim_cond_bw_cat);
  # create new condition sim_cond_both, which can take one of four values
  #for(i in 1:length(data$cond)) {
  #  cond_str = unlist(strsplit(as.character(data$cond[i]), '-'));
  #  data$sim_cond_both_cat[i] = paste0(substr(data$sim_cond_wi_cat[i],1,3)
  #                                     , '-'
  #                                     ,substr(data$sim_cond_bw_cat[i],1,3));
  #}
  
  # reorder similarity factor levels
  #data$sim_cond_both_cat = factor(data$sim_cond_both_cat, c("dis-dis", "sim-dis", "dis-sim", "sim-sim"));
  
  # new idea by Rob: use the problem difficulty as a covariate!
  # calculate problem difficulty as average accuracy
  d_pbp = ddply(.data=data, .variables=.(pbp)
                ,accuracy=mean(found_solution)
                ,.fun=summarize);
  
  get_pbp_accuracy <- function(pbp) {
    return(d_pbp$accuracy[d_pbp$pbp==pbp]);
  }
  
  data$pbp_accuracy = as.numeric(lapply(data$pbp, get_pbp_accuracy));
  
  return(data)
}
