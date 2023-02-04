import re

markdown = re.compile(r"[*_`~]")
discord_string_start = re.compile(r"[<@:]")
do_not_capitalize = re.compile(r"(^<.*>$)|(^.+:\/\/.+$)")
url = re.compile(r"^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$")
