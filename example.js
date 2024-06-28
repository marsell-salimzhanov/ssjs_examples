function log(strLog) {
  var myLogName = "myLog";
  EnableLog(myLogName, true);
  LogEvent(myLogName, strLog);
  EnableLog(myLogName, false);
}
/**
 * Функция возвращает id T&D партнера
 */
function getTdPartner(subdivisionId) {
  try {
    sql = "sql:
		WITH Recursive(id, parent_object_id, name)
    AS
      (
        SELECT s.id, parent_object_id, name
			FROM subdivisions s
				inner join subdivision sx
					on s.id = sx.id
			WHERE s.id = "+subdivisionId+"
			UNION ALL
			SELECT s.id, s.parent_object_id, s.name
			FROM subdivisions s
				JOIN Recursive r ON s.id = r.parent_object_id
      )
		SELECT top 1  r.id, parent_object_id, name, sx.data.value('(/subdivision/custom_elems/custom_elem[name=''td_partner'']/value)[1]', 'varchar(max)') as 'td_partner'
		FROM Recursive r
			inner join subdivision sx
					on r.id = sx.id
		where sx.data.value('(/subdivision/custom_elems/custom_elem[name=''td_partner'']/value)[1]', 'varchar(max)') is not null
    ";
    var res = ArrayOptFirstElem(XQuery(sql));
    if (res != undefined) {
      return Int(res.td_partner);
    }
    return undefined;
    //log(String(ArrayOptFirstElem(XQuery(sql)).td_partner));
  }
  catch (err) {
    log(err);
    return null;
  }
}


/**
 * Агент напоминает о дне рождения сотрудника
 */

var REMINDER_DAYS = 14;

function log(strLog) {
  var myLogName = "birthday_reminder";
  EnableLog(myLogName, true);
  LogEvent(myLogName, strLog);
  EnableLog(myLogName, false);
}

var sql_baseQuery = "
select
DATEDIFF(day, getdate(),
  convert(date, cast(datepart(day, cl.birth_date) as varchar(2)) + '.' + cast(datepart(month, cl.birth_date) as varchar(2)) + '.' + cast(datepart(year, getdate()) as char(4)), 104)
) as dd
  , cl.*
	, gc.code as g_code
from collaborators cl
inner join(
    select
		gc.code
    , gc.collaborator_id
	from group_collaborators gc
	where
		gc.code like '%birthday_reminder%'
  ) gc
	on gc.collaborator_id = cl.id
";

var sql_getBirthdayGuys = sql_baseQuery + "
where
convert(date, cast(datepart(day, cl.birth_date) as varchar(2)) + '.' + cast(datepart(month, cl.birth_date) as varchar(2)) + '.' + cast(datepart(year, getdate()) as char(4)), 104) = cast(GETDATE() + "+REMINDER_DAYS+" as date)
";

var sql_colleagues;

var res_getBirthdayGuys = XQuery("sql: " + sql_getBirthdayGuys);
if (ArrayOptFirstElem(res_getBirthdayGuys) != undefined) {
  for (bg in res_getBirthdayGuys) {
    sql_colleagues = sql_baseQuery + "
    where
    cl.id != "+bg.id+"
				and gc.code = '"+bg.g_code+"'
    ";
    res_colleagues = XQuery("sql: " + sql_colleagues);
    for (bc in res_colleagues) {
      log("Отправил для " + bc.fullname + " уведомление о ДР " + bg.fullname);
      tools.create_notification('dko_birthday', bc.id, '', gb.id);
    }
  }
}

/**
 * Системное назначает активность при назначении теста
 */

function require(url) {
  // DropFormsCache(url);
  return OpenCodeLib(url);
  //return OpenCodeLib(url+'?'+Random(1, 1000000000))
}

var lib = require('x-local://example.js');

function log(strLog) {
  var myLogName = "myLog";
  EnableLog(myLogName, true);
  LogEvent(myLogName, strLog);
  EnableLog(myLogName, false);
}

var sql_isActivityAssigned = "sql:
select
act.id as activity_id
  , actassig.id as actassig_id
  , iif(actassig.id is null, 1, 0) as is_new_object
  from cc_activitys act
  left outer join(
    select
    *
    from cc_activity_assigneds aa
    where
      aa.status = 1
  ) as actassig
    on act.id = actassig.activity_id
where
act.internal_object_id = "+assessmentID+"
";
var res = XQuery(sql_isActivityAssigned);
if (ArrayCount(res) > 0) {
  var res_isActivityAssigned = ArrayOptFirstElem(res);
  if (res_isActivityAssigned.is_new_object == 1) {
    var _dateStart = StrCharCount(learningDoc.start_learning_date) > 0 ? learningDoc.start_learning_date : learningDoc.start_usage_date;
    var _dateFinish = learningDoc.max_end_date;
    var _pDoc = lib.createAssignedActivityDoc(Int(res_isActivityAssigned.activity_id), personID, personID, _dateFinish, _dateStart, '');
  } else {
    log('тест уже назначен - ' + assessmentID);
  }
}