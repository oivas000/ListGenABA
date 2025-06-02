#!/usr/bin/python3
from collections import Counter
import sqlite3
import random
import calendar
import csv
import argparse
import re

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
    c.execute('''
        UPDATE ABA
        SET
            B = CASE WHEN B = 0 THEN 0 ELSE 100 END,
            R = CASE WHEN R = 0 THEN 0 ELSE 100 END,
            I = CASE WHEN I = 0 THEN 0 ELSE 100 END
    ''')
    con.commit()
    print("Weights reset, preserving zeros.")

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
        self.animation = animation or ['-', '\\', '|', '/']
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
    i_names = []

    # Collect names from the schedule
    for date, slots in schedule.items():
        for slot in slots:
            b_names.append(slot[0])  # Bible reading names
            r_names.append(slot[1])  # Reading names
            i_names.append(slot[2])  # Incense names

    # Count frequencies
    b_counter = Counter(b_names)
    r_counter = Counter(r_names)
    i_counter = Counter(i_names)

    # Get all names from the database
    all_names = [row[0] for row in c.execute("SELECT NAME FROM ABA").fetchall()]

    # Find missing names
    missing_in_b = set(all_names) - set(b_counter.keys())
    missing_in_r = set(all_names) - set(r_counter.keys())
    missing_in_i = set(all_names) - set(i_counter.keys())

    # Get top 10 most and least frequent names
    top_10_b = b_counter.most_common(10)
    least_10_b = b_counter.most_common()[:-11:-1]
    top_10_r = r_counter.most_common(10)
    least_10_r = r_counter.most_common()[:-11:-1]
    top_10_i = i_counter.most_common(10)
    least_10_i = i_counter.most_common()[:-11:-1]

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

    print("\nTop 10 Most Incense (I):")
    for name, count in top_10_i:
        print(f"     {name} ({count})")
    print("\nTop 10 Least Incense (I):")
    for name, count in least_10_i:
        print(f"     {name} ({count})")
    print("\nNames Not Assigned in Incense (I):")
    if missing_in_i:
        for name in missing_in_i:
            print(f"     {name}")
    else:
        print("     None")
    """
    repeats = []

    for day, groups in schedule.items():
        for i, group in enumerate(groups):
            seen = set()
            duplicates = [name for name in group if name in seen or seen.add(name)]
            if duplicates:
                repeats.append((day, i + 1, group, duplicates))

    # Output the repeated entries
    for day, group_num, group, duplicates in repeats:
        print(f"DAY {day}, HOLY MASS {group_num}: {group} -> REPETITIONS: {duplicates}")
    """

def fix_schedule(schedule):
    """
    Resolve adjacent-day conflicts in the schedule.
    - schedule: dict mapping day (int or str) -> list of (bible, reading, incense) tuples.
    - year, month: integers for calendar.weekday if day keys are numeric.
    Returns a new schedule dict with conflicts resolved.
    """
    # Map letters to weekday index if keys are strings.
    weekday_map = {'M': 0, 'T': 1, 'W': 2, 'R': 3, 'F': 4, 'S': 5, 'U': 6}

    # Build numeric mapping for days
    key_to_num = {}
    num_to_key = {}
    numeric_schedule = {}

    # Parse keys: if int, use directly; if str, extract digits for day.
    for key, slots in schedule.items():
        if isinstance(key, int):
            day_num = key
        else:
            m = re.search(r'\d+', key)
            if m:
                day_num = int(m.group())
            else:
                # Skip keys without a numeric day part
                continue

        key_to_num[key] = day_num
        if day_num not in num_to_key:
            num_to_key[day_num] = key
        # Convert each tuple to a mutable list for swapping
        numeric_schedule[day_num] = [list(slot) for slot in slots]

    # Up to 20 passes or until no changes
    for _ in range(20):
        changes = 0
        # Sorted list of numeric days for adjacency
        days = sorted(numeric_schedule.keys())

        # Check each consecutive day pair
        for idx in range(len(days) - 1):
            d = days[idx]
            next_d = days[idx + 1]
            # Only consider truly adjacent days
            if next_d != d + 1:
                continue

            tasks_d = numeric_schedule[d]
            tasks_next = numeric_schedule[next_d]
            # Compare slot-by-slot
            min_slots = min(len(tasks_d), len(tasks_next))
            for slot in range(min_slots):
                # Before checking tasks, set found_swap = False for this slot
                found_swap = False

                # Check each task in (bible, reading, incense)
                for task_idx in range(3):
                    person_d = tasks_d[slot][task_idx]
                    person_n = tasks_next[slot][task_idx]

                    # Conflict if same person on same task
                    if person_d and person_d == person_n:
                        person = person_n

                        # Attempt swapping using day (next_d) as the conflict day
                        for offset in (7, -7, 14, -14, 21, -21, 28, -28):
                            target = next_d + offset
                            if target not in numeric_schedule:
                                continue
                            if slot >= len(numeric_schedule[target]):
                                continue

                            other = numeric_schedule[target][slot][task_idx]
                            if not other or other == person:
                                continue

                            # Ensure 'other' is not already on next_d elsewhere
                            if any(
                                other == t
                                for i, t in enumerate(tasks_next[slot])
                                if i != task_idx
                            ) or any(
                                other == t
                                for s in tasks_next
                                for t in s
                                if s is not tasks_next[slot]
                            ):
                                continue

                            # Ensure 'person' is not already on target day elsewhere
                            if any(
                                person == t
                                for s in numeric_schedule[target]
                                for t in s
                                if s is not numeric_schedule[target][slot]
                            ):
                                continue

                            # Check slot uniqueness after swap:
                            # In next_d: replacing person by other
                            if any(
                                other == t
                                for i, t in enumerate(tasks_next[slot])
                                if i != task_idx
                            ):
                                continue
                            # In target day: replacing other by person
                            if any(
                                person == t
                                for i, t in enumerate(numeric_schedule[target][slot])
                                if i != task_idx
                            ):
                                continue

                            # Perform swap
                            tasks_next[slot][task_idx] = other
                            numeric_schedule[target][slot][task_idx] = person
                            found_swap = True
                            changes += 1
                            break

                        # If not swapped yet, try swapping person on day d instead
                        if not found_swap:
                            for offset in (7, -7, 14, -14, 21, -21, 28, -28):
                                target = d + offset
                                if target not in numeric_schedule:
                                    continue
                                if slot >= len(numeric_schedule[target]):
                                    continue

                                other = numeric_schedule[target][slot][task_idx]
                                if not other or other == person:
                                    continue

                                # Check distinctness on day d
                                if any(
                                    other == t
                                    for s in tasks_d
                                    for t in s
                                    if s is not tasks_d[slot]
                                ):
                                    continue

                                # Ensure 'person' not on target day elsewhere
                                if any(
                                    person == t
                                    for s in numeric_schedule[target]
                                    for t in s
                                    if s is not numeric_schedule[target][slot]
                                ):
                                    continue

                                # Slot uniqueness checks
                                if any(
                                    other == t
                                    for i, t in enumerate(tasks_d[slot])
                                    if i != task_idx
                                ):
                                    continue
                                if any(
                                    person == t
                                    for i, t in enumerate(numeric_schedule[target][slot])
                                    if i != task_idx
                                ):
                                    continue

                                # Perform swap
                                tasks_d[slot][task_idx] = other
                                numeric_schedule[target][slot][task_idx] = person
                                found_swap = True
                                changes += 1
                                break

                        # Once we’ve attempted a swap for this conflict, break out
                        if found_swap:
                            break

                # If we found a swap for this slot, move on to next slot
                if found_swap:
                    continue

        # If no changes this pass, schedule is stable
        if changes == 0:
            break

    # Reconstruct schedule in original key format
    new_schedule = {}
    for day_num, slots in numeric_schedule.items():
        orig_key = num_to_key.get(day_num, day_num)
        # Convert lists back to tuples
        new_schedule[orig_key] = [tuple(slot) for slot in slots]

    return new_schedule

def organize_schedule():
    schedule = {}
    for e in month_dict:
        d = month_dict[e]
        l1 = eval(f'{d}1l')
        l2 = eval(f'{d}2l')
        l3 = eval(f'{d}3l')

        schedule[e] = [
            (get_real_name(l1[0][0])[0][0], get_real_name(l1[0][1])[0][0], get_real_name(l1[0][2])[0][0]),
            (get_real_name(l2[0][0])[0][0], get_real_name(l2[0][1])[0][0], get_real_name(l2[0][2])[0][0]),
            (get_real_name(l3[0][0])[0][0], get_real_name(l3[0][1])[0][0], get_real_name(l3[0][2])[0][0]),
        ]

        del l1[0]
        del l2[0]
        del l3[0]
    #a1=schedule
    #a2 = fix_schedule(schedule)
    #print(a1)
    #print(a2)
    #return a2
    return fix_schedule(schedule)

def csv_writer(schedule):
    with open(f'DAILY BIBLE READING LIST {month_name} {year}.csv', 'w', newline='') as Bfile, \
         open(f'DAILY READING LIST {month_name} {year}.csv', 'w', newline='') as Rfile, \
         open(f'DAILY INCENSE LIST {month_name} {year}.csv', 'w', newline='') as Ifile:

        b_writer = csv.writer(Bfile)
        r_writer = csv.writer(Rfile)
        i_writer = csv.writer(Ifile)
        b_writer.writerow([f'DAILY BIBLE READING LIST {month_name} {year}', '', '', ''])
        b_writer.writerow(['DATE', '6:00 am', '7:30 am', '5:00 pm'])
        r_writer.writerow([f'DAILY READING LIST {month_name} {year}', '', '', ''])
        r_writer.writerow(['DATE', '6:00 am', '7:30 am', '5:00 pm'])
        i_writer.writerow([f'DAILY INCENSE LIST {month_name} {year}', '', '', ''])
        i_writer.writerow(['DATE', '6:00 am', '7:30 am', '5:00 pm'])

        for date, slots in schedule.items():
            b_writer.writerow([date] + [slot[0] for slot in slots])
            r_writer.writerow([date] + [slot[1] for slot in slots])
            i_writer.writerow([date] + [slot[2] for slot in slots])

def arranger(b, r, i, d, t):
    var_name = f"{d}{t}l"
    var_value = eval(var_name)
    var_value.append([b, r, i])

def random_selector(tuple_mems_ids, d, t):
    B_db_weights = [get_weight('B', mem_id)[0][0] for mem_id in tuple_mems_ids]
    R_db_weights = [get_weight('R', mem_id)[0][0] for mem_id in tuple_mems_ids]
    I_db_weights = [get_weight('I', mem_id)[0][0] for mem_id in tuple_mems_ids]
    #print(B_db_weights)
    #print(R_db_weights)
    #print(I_db_weights)

    B_max_weights = max(B_db_weights); B_weights = [w if w == B_max_weights else 0 for w in B_db_weights]
    #print(B_weights)

    R_max_weights = max(R_db_weights); R_weights = [w if w == R_max_weights else 0 for w in R_db_weights]
    #print(R_weights)

    I_max_weights = max(I_db_weights); I_weights = [w if w == I_max_weights else 0 for w in I_db_weights]
    #print(I_weights)

    b = random.choices(tuple_mems_ids, weights=B_weights)[0]
    r = random.choices(tuple_mems_ids, weights=R_weights)[0]
    i = random.choices(tuple_mems_ids, weights=I_weights)[0]

    # Select r != b
    while True:
        R_max_weights = max(R_db_weights)
        R_weights = [w if w == R_max_weights else 0 for w in R_db_weights]
        r = random.choices(tuple_mems_ids, weights=R_weights)[0]
        if r != b:
            break
        R_db_weights[tuple_mems_ids.index(r)] -= 10

    # Select i != b and i != r
    while True:
        I_max_weights = max(I_db_weights)
        I_weights = [w if w == I_max_weights else 0 for w in I_db_weights]
        i = random.choices(tuple_mems_ids, weights=I_weights)[0]
        if i != b and i != r:
            break
        I_db_weights[tuple_mems_ids.index(i)] -= 10

    arranger(int(b), int(r), int(i), d, t)
    set_weight('B', b, -10)
    set_weight('R', b, -5)
    #set_weight('I', b, -5)
    set_weight('R', r, -10)
    set_weight('B', r, -5)
    #set_weight('I', r, -5)
    set_weight('I', i, -10)
    #set_weight('B', i, -5)
    #set_weight('R', i, -5)
    #print('BIBLE   :', b, get_real_name(b)[0][0])
    #print('READING :', r, get_real_name(r)[0][0])
    #print('INCENSE :', i, get_real_name(r)[0][0])
    return b, r, i

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

    c.execute('''
        UPDATE ABA
        SET
            B = CASE WHEN B = 0 THEN 0 ELSE B + 20 END,
            R = CASE WHEN R = 0 THEN 0 ELSE R + 20 END,
            I = CASE WHEN I = 0 THEN 0 ELSE I + 20 END
    ''')
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
