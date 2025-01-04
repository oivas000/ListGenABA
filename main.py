#!/usr/bin/python3
from collections import Counter
import sqlite3
import random
import calendar
import csv
import argparse

print('Created by @oivas000')

def week_count(year, month, week):
    return sum(row.count(week) for row in month_info)

def month_dict(year, month):
    month_info
    global month_dict
    month_dict = {num: val for day, week in zip(month_cal, month_info) for num, val in zip(day, week)}
    try:
        del month_dict[0]
    except KeyError:
        print('No Zero value Found')
    #print(month_dict)
    return month_dict

def get_real_name(mem_id):
    rn = c.execute(f'SELECT NAME FROM ABA WHERE No = {mem_id}')
	#print(rn.fetchall())
    return rn.fetchall()

def set_weight(col, mem_id, weight):
    c.execute(f'UPDATE ABA SET {col} = {col}+{weight} WHERE No = {mem_id}')
    con.commit()
    #print(f'Added {weight} {col} weight to member : {mem_id} {get_real_name(mem_id)[0][0]}')

def reset_weight():
    c.execute(f'UPDATE ABA SET (B, R) = (100, 100)')
    con.commit()
    print("Weights resetted.")

def get_weight(col, mem_id):
    rn = c.execute(f'SELECT {col} FROM ABA WHERE No = ?', (mem_id,))
	#print(rn.fetchall())
    return rn.fetchall()

class ProgressBar:
    def __init__(self, total, prefix='Progress', length=56, fill='█', animation=None):
        self.total = total
        self.prefix = prefix
        self.length = length
        self.fill = fill
        self.animation = animation or ['- ', '\\ ', '| ', '/ ']
        self.current = 0

    def update(self, progress):
        self.current = progress
        percent = int(100 * self.current / self.total)
        filled_length = int(self.length * self.current // self.total)
        bar = self.fill * filled_length + '-' * (self.length - filled_length)
        anim = self.animation[self.current % len(self.animation)]
        print(f'\r{self.prefix} |{bar}| {percent}% {anim}', end='')

    def complete(self):
        print()

def analyze_frequencies(schedule):
    b_names = []
    r_names = []

    # Collect names from the schedule
    for date, slots in schedule.items():
        for slot in slots:
            b_names.append(slot[0])  # Bible reading names
            r_names.append(slot[1])  # Reading names

    # Count frequencies
    b_counter = Counter(b_names)
    r_counter = Counter(r_names)

    # Get all names from the database
    all_names = [row[0] for row in c.execute("SELECT NAME FROM ABA").fetchall()]

    # Find missing names
    missing_in_b = set(all_names) - set(b_counter.keys())
    missing_in_r = set(all_names) - set(r_counter.keys())

    # Get top 10 most and least frequent names
    top_10_b = b_counter.most_common(10)
    least_10_b = b_counter.most_common()[:-11:-1]
    top_10_r = r_counter.most_common(10)
    least_10_r = r_counter.most_common()[:-11:-1]

    # Display results
    print("\nTop 10 Most Bible Reading (B):")
    for name, count in top_10_b:
        print(f"     {name} ({count})")
    print("\nTop 10 Least Bible Reading (B):")
    for name, count in least_10_b:
        print(f"     {name} ({count})")
    print("\nNames Not Assigned in Bible Reading (B):")
    if missing_in_b:
        for name in missing_in_b:
            print(f"     {name}")
    else:
        print("     None")

    print("\nTop 10 Most Reading (R):")
    for name, count in top_10_r:
        print(f"     {name} ({count})")
    print("\nTop 10 Least Reading (R):")
    for name, count in least_10_r:
        print(f"     {name} ({count})")
    print("\nNames Not Assigned in Reading (R):")
    if missing_in_r:
        for name in missing_in_r:
            print(f"     {name}")
    else:
        print("     None")

def fix_adjacent_repetition_week_based(schedule):
    """
    Adjusts the schedule to avoid adjacent repetitions in Bible and Reading assignments,
    ensuring no repetition within the same day and resolving conflicts week-wise.
    """
    days = sorted(schedule.keys())  # Ordered list of days for easy indexing

    # Iterate through each time slot (3 per day)
    for slot in range(3):
        for day_idx, day in enumerate(days):
            if day_idx == 0:  # Skip the first day (no previous week to check)
                continue

            # Get current and previous week's assignments
            curr_bible, curr_reading = schedule[day][slot]
            prev_day = days[day_idx - 7] if day_idx >= 7 else None

            # Check repetition within the same slot across weeks
            if prev_day:
                prev_bible, prev_reading = schedule[prev_day][slot]

                # If Bible names match, swap with previous week
                if curr_bible == prev_bible:
                    schedule[day][slot], schedule[prev_day][slot] = schedule[prev_day][slot], schedule[day][slot]
                    curr_bible, curr_reading = schedule[day][slot]  # Update after swapping

                # If Reading names match, swap with previous week
                if curr_reading == prev_reading:
                    schedule[day][slot], schedule[prev_day][slot] = schedule[prev_day][slot], schedule[day][slot]

            # Check for conflicts within the same day (e.g., same Bible/Reading name in any time slot)
            for other_slot in range(3):
                if other_slot == slot:
                    continue

                other_bible, other_reading = schedule[day][other_slot]

                # Ensure Bible and Reading names are not repeated in the same day
                if curr_bible == other_bible or curr_reading == other_reading:
                    # Swap with the same slot in the next/previous week
                    next_day = days[day_idx + 7] if day_idx + 7 < len(days) else None
                    if next_day:
                        schedule[day][slot], schedule[next_day][slot] = schedule[next_day][slot], schedule[day][slot]

    return schedule

def organize_schedule():
    schedule = {}
    for e in month_dict:
        d = month_dict[e]
        l1 = eval(f'{d}1l')
        l2 = eval(f'{d}2l')
        l3 = eval(f'{d}3l')

        schedule[e] = [
            (get_real_name(l1[0][0])[0][0], get_real_name(l1[0][1])[0][0]),
            (get_real_name(l2[0][0])[0][0], get_real_name(l2[0][1])[0][0]),
            (get_real_name(l3[0][0])[0][0], get_real_name(l3[0][1])[0][0]),
        ]

        del l1[0]
        del l2[0]
        del l3[0]

    return fix_adjacent_repetition_week_based(schedule)


def csv_writer(schedule):
    with open(f'DAILY BIBLE READING LIST {month_name} {year}.csv', 'w', newline='') as Bfile, \
         open(f'DAILY READING LIST {month_name} {year}.csv', 'w', newline='') as Rfile:
        b_writer = csv.writer(Bfile)
        r_writer = csv.writer(Rfile)
        b_writer.writerow([f'DAILY BIBLE READING LIST {month_name} {year}', '', '', ''])
        b_writer.writerow(['DATE', '6:00 am', '7:30 am', '5:00 pm'])
        r_writer.writerow([f'DAILY READING LIST {month_name} {year}', '', '', ''])
        r_writer.writerow(['DATE', '6:00 am', '7:30 am', '5:00 pm'])

        for date, slots in schedule.items():
            b_writer.writerow([date] + [slot[0] for slot in slots])
            r_writer.writerow([date] + [slot[1] for slot in slots])

def arranger(b, r, d, t):
    var_name = f"{d}{t}l"
    var_value = eval(var_name)
    var_value.append([b, r])

def random_selector(tuple_mems_ids, d, t):
    B_db_weights = [get_weight('B', mem_id)[0][0] for mem_id in tuple_mems_ids]
    R_db_weights = [get_weight('R', mem_id)[0][0] for mem_id in tuple_mems_ids]
    #print(B_db_weights)
    #print(R_db_weights)

    B_max_weights = max(B_db_weights); B_weights = [w if w == B_max_weights else 0 for w in B_db_weights]
    #print(B_weights)

    R_max_weights = max(R_db_weights); R_weights = [w if w == R_max_weights else 0 for w in R_db_weights]
    #print(R_weights)

    b = random.choices(tuple_mems_ids, weights=B_weights)[0]
    r = random.choices(tuple_mems_ids, weights=R_weights)[0]

    while b == r:
        R_db_weights[tuple_mems_ids.index(r)] -= 10
        R_max_weights = max(R_db_weights); R_weights = [w if w == R_max_weights else 0 for w in R_db_weights]
        r = random.choices(tuple_mems_ids, weights=R_weights)[0]

    arranger(int(b), int(r), d, t)
    set_weight('B', b, -10)
    set_weight('R', r, -10)
    #print('BIBLE   :', b, get_real_name(b)[0][0])
    #print('READING :', r, get_real_name(r)[0][0])
    return b, r

def main():
    progress = ProgressBar(21)
    for l in week_names:
        for n in range(1,4):
            columns.append(f"{l}{n}")
    query_parts = []
    for col in columns:
        query_parts.append(f"SELECT '{col}' AS column_name, SUM(CASE WHEN {col} = '1' THEN 1 ELSE 0 END) AS x_count FROM ABA")
    full_query = " UNION ALL ".join(query_parts) + " ORDER BY x_count ASC"
    c.execute(full_query)
    least_mems = [(col[0],) for col in c.fetchall()]
    #print(least_mems)
    i=1
    month_dict(year, month)
    for mass in least_mems:
        #print(mass[0])
        dt = mass[0]
        d, t = dt[0], dt[1]
        #print('\n' + day[d] + ' ' + time[t])
        mems_ids = c.execute(f'SELECT No FROM ABA WHERE {mass[0]} = 1', ())
        tuple_mems_ids = [id[0] for id in mems_ids.fetchall()]
        #print(tuple_mems_ids)

        for e in range(week_count(year, month, d)):
            random_selector(tuple_mems_ids, d, int(t))
        progress.update(i)
        i=i+1
    progress.complete()

    for letter in week_names:
        for number in range(1,4):
            var_name = f"{letter}{number}l"
            var_value = eval(var_name)
            random.shuffle(eval(var_name))
            #print(eval(var_name))
            #print(f"{var_name} {var_value}")

    schedule = organize_schedule()
    analyze_frequencies(schedule)
    csv_writer(schedule)

    #print('\n')
    #print(no_of_mems)

    c.execute(f'UPDATE ABA SET (B, R) = (B+20, R+20)')
    con.commit()

    #for tmid in tuple_mems_ids:
        #print(get_real_name(tmid)[0][0])

with sqlite3.connect('ABA.db') as con:
    c = con.cursor()
    print('Database Opened')
    parser = argparse.ArgumentParser(description="Script to generate a schedule from a SQLite DB for a custom purpose.")
    parser.add_argument('month', type=int, nargs='?', help="Month in MM")
    parser.add_argument('year', type=int, nargs='?', help="Year in YYYY")
    parser.add_argument("--reset", "-r", action="store_true", help="Resets weights to default")
    args = parser.parse_args()
    if args.reset:
        reset_weight()
        exit()
    elif args.month is None or args.year is None:
        parser.error("The following arguments are required: month, year or -r for reseting weights.")
    month = args.month
    year = args.year
    columns = []
    m1l, m2l, m3l, t1l, t2l, t3l, w1l, w2l, w3l, h1l, h2l, h3l, f1l, f2l, f3l, s1l, s2l, s3l, u1l, u2l, u3l = [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], []
    #day = {'m': 'MONDAY', 't': 'TUESDAY', 'w': 'WEDNESDAY', 'h': 'THURSDAY', 'f': 'FRIDAY', 's': 'SATURDAY', 'u': 'SUNDAY'}
    #time = {'1': '6:00 AM', '2': '7:30 AM', '3': '5:00 PM'}
    month_cal = calendar.monthcalendar(year, month)
    month_name = str.upper(calendar.month_name[month])
    week_names = ['m', 't', 'w', 'h', 'f', 's', 'u']
    month_info = [[week_names[i] if week[i] != 0 else '' for i in range(len(week))] for week in month_cal]
    main()
    print('Database Closed')