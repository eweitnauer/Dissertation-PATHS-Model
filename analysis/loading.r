# import data for algorithmic data

# renames the following columns: mturk_id (rep), found_solution (solved), cond (pres_mode), train_time (steps)
load_data_old = function() {
  #data = read.csv("pbp-computer-results.csv", header=TRUE, colClasses=c("steps"="numeric"));
  data = read.csv("data-0-5-6-latest.csv", header=TRUE, colClasses=c("steps"="numeric"));
  data = rename(data, c("solved"="found_solution","pres_mode"="cond","steps"="train_time","rep"="mturk_id"));
  data$found_solution = ifelse((data$found_solution == 'true') | (data$found_solution == 1), 1, 0);
  
  # for now, don't use problems PBP35 and PBP36
  pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp31');#, 'pbp35', 'pbp36');
  data = data[data$pbp %in% pbps,]
  #data$pbp = revalue(data$pbp, c("pbp02"="2", "pbp04"="4", "pbp08"="8", "pbp11b"="11b", 'pbp12'='12', 'pbp13'='13', 'pbp16'='16', 'pbp18'='18', 'pbp20'='20', 'pbp22'='22', 'pbp26'='26', 'pbp31'='31'));#, 'pbp35', 'pbp36');))
  data = droplevels(data)
  
  print("subjects total:")
  print(length(table(data$mturk_id)))
  print("% problems solved:");
  print(100 * sum(data$found_solution) / length(data$found_solution));
  
  return(data)
}

load_data = function(use_all=FALSE,filename="data-0-7-0.csv") {
  data = read.csv(filename, header=TRUE, colClasses=c("steps"="numeric"));
  data = rename(data, c("solved"="found_solution","pres_mode"="cond","steps"="train_time","rep"="mturk_id"));
  data$found_solution = ifelse((data$found_solution == 'true') | (data$found_solution == 1), 1, 0);
  
  # for now, don't use problems PBP35 and PBP36
  if (use_all) {
    pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp30', 'pbp31', 'pbp35', 'pbp36');
  } else {
    pbps = c('pbp02', 'pbp04', 'pbp08', 'pbp11b', 'pbp12', 'pbp13', 'pbp16', 'pbp18', 'pbp20', 'pbp22', 'pbp26', 'pbp30', 'pbp31');
  }
  data = data[data$pbp %in% pbps,]
  data$pbp = revalue(data$pbp, c("pbp02"="2", "pbp04"="4", "pbp08"="8", "pbp11b"="11b", 'pbp12'='12', 'pbp13'='13', 'pbp16'='16', 'pbp18'='18', 'pbp20'='20', 'pbp22'='22', 'pbp26'='26', 'pbp30'='30', 'pbp31'='31', 'pbp35'='35', 'pbp36'='36'));
  data = droplevels(data)
  
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
  data$sch_cond = ifelse(data$cond %in% c('blocked-dis-dis','blocked-sim-sim','blocked-dis-sim','blocked-sim-dis'),'blocked'
                        ,ifelse(data$cond %in% c('interleaved-dis-dis','interleaved-sim-sim','interleaved-dis-sim','interleaved-sim-dis'), 'interleaved', 'full-blocked'));
  
  # similarity within scene pairs and between scene pairs
  data$sim_cond_wi_pair = ifelse(data$cond %in% c('blocked-dis-sim','interleaved-dis-sim','interleaved-dis-dis','blocked-dis-dis','fullblocked-dis-sim','fullblocked-dis-dis'),'dissimilar scenes paired','similar scenes paired')
  data$sim_cond_bw_pair = ifelse(data$cond %in% c('blocked-dis-sim','interleaved-dis-sim','interleaved-sim-sim','blocked-sim-sim'),'similar pairs next to each other','dissimilar pairs next to each other')
  
  # similarity in within category and between category comparisions
  #   since - same as in experiment 3.2 - the original similarity conditions were named based on w/i and b/w *pair* similarity,
  #   we need to swap interleaved-dis-sim with interleaved-sim-dis to get to the w/i and b/w *category* similarities we want.
  data$sim_cond_wi_cat = ifelse(data$cond %in% c('blocked-dis-sim','blocked-dis-dis', 'interleaved-dis-dis','interleaved-sim-dis','fullblocked-dis-sim','fullblocked-dis-dis'), 'dis. w/i cat.','sim. w/i cat.')
  data$sim_cond_bw_cat = ifelse(data$cond %in% c('blocked-dis-dis','blocked-sim-dis', 'interleaved-dis-dis','interleaved-dis-sim','fullblocked-sim-dis','fullblocked-dis-dis'), 'dis. b/w cat.','sim. b/w cat.')
  
  
  # this line is *much* faster than the loop below
  data$sim_cond_both_cat = interaction(data$sim_cond_wi_cat, data$sim_cond_bw_cat, sep=', ');
  
  # reorder similarity factor levels
  #data$sim_cond_both_cat = factor(data$sim_cond_both_cat, c("dis. w/i cat., dis. b/w cat.", "sim. w/i cat., dis. b/w cat.", "dis. w/i cat., sim. b/w cat.", "sim. w/i cat., sim. b/w cat."));
  
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
