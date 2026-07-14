import enum

class SenderEnum(str, enum.Enum):
    user = 'user'
    bot = 'bot'

class ActionEnum(str, enum.Enum):
    view = 'view'
    click = 'click'
    search = 'search'
    rate = 'rate'
    watch = 'watch'

class RoleEnum(str, enum.Enum):
    user = 'user'
    admin = 'admin'
