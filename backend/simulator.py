import datetime
from decimal import Decimal
from typing import Dict, List, Optional

class Asset:
    def __init__(self, code: str, name: str, current_price: Decimal):
        self.code = code
        self.name = name
        self.current_price = current_price

class Order:
    def __init__(self, code: str, volume: int, direction: str, price: Decimal, time: datetime.datetime):
        self.code = code
        self.volume = volume  # Must be multiple of 100
        self.direction = direction  # 'BUY' or 'SELL'
        self.price = price
        self.time = time
        self.status = 'PENDING'

class Position:
    def __init__(self, code: str, volume: int, cost_price: Decimal):
        self.code = code
        self.volume = volume
        self.available_volume = 0  # T+1 constraint: volume that can be sold today
        self.cost_price = cost_price

    def to_dict(self):
        return {
            "code": self.code,
            "volume": self.volume,
            "available_volume": self.available_volume,
            "cost_price": float(self.cost_price)
        }

    @classmethod
    def from_dict(cls, data):
        pos = cls(data["code"], data["volume"], Decimal(str(data["cost_price"])))
        pos.available_volume = data.get("available_volume", 0)
        return pos

class Account:
    def __init__(self, initial_cash: Decimal):
        self.cash = initial_cash
        self.net_value = initial_cash
        self.positions: Dict[str, Position] = {}
        self.orders: List[Order] = []
        self.history: List[float] = [float(initial_cash)]  # Daily net value history

    def to_dict(self):
        return {
            "cash": float(self.cash),
            "net_value": float(self.net_value),
            "positions": {k: v.to_dict() for k, v in self.positions.items()},
            "orders": [
                {
                    "code": o.code, "volume": o.volume, "direction": o.direction,
                    "price": float(o.price), "time": o.time.strftime("%Y-%m-%d %H:%M:%S"),
                    "logic": getattr(o, 'logic', 'N/A')
                } for o in self.orders
            ],
            "history": self.history
        }

    @classmethod
    def from_dict(cls, data):
        acc = cls(Decimal(str(data["cash"])))
        acc.net_value = Decimal(str(data["net_value"]))
        acc.positions = {k: Position.from_dict(v) for k, v in data.get("positions", {}).items()}
        acc.history = data.get("history", [float(acc.net_value)])
        # Parse orders
        for o in data.get("orders", []):
            order = Order(o["code"], o["volume"], o["direction"], Decimal(str(o["price"])), datetime.datetime.strptime(o["time"], "%Y-%m-%d %H:%M:%S"))
            order.logic = o.get("logic", "N/A")
            acc.orders.append(order)
        return acc

    @property
    def total_buying_power(self) -> Decimal:
        """Total buying power without leverage, equal to available cash."""
        return self.cash

    def update_net_value(self, current_prices: Dict[str, Decimal]):
        market_value = sum(
            pos.volume * current_prices.get(pos.code, pos.cost_price)
            for pos in self.positions.values()
        )
        self.net_value = self.cash + market_value

    def can_buy(self, code: str, volume: int, price: Decimal) -> bool:
        if volume % 100 != 0:
            return False
        total_cost = volume * price
        # No leverage: only allow purchases within available cash.
        return total_cost <= self.cash

    def buy(self, code: str, volume: int, price: Decimal, time: datetime.datetime):
        if not self.can_buy(code, volume, price):
            return False
        
        total_cost = volume * price
        # Simplified: Deduct from cash
        self.cash -= total_cost
        
        if code in self.positions:
            pos = self.positions[code]
            total_vol = pos.volume + volume
            pos.cost_price = (pos.volume * pos.cost_price + total_cost) / total_vol
            pos.volume = total_vol
        else:
            self.positions[code] = Position(code, volume, price)
        
        self.orders.append(Order(code, volume, 'BUY', price, time))
        return True

    def sell(self, code: str, volume: int, price: Decimal, time: datetime.datetime):
        if code not in self.positions:
            return False
        
        pos = self.positions[code]
        if pos.available_volume < volume:
            return False
        
        total_revenue = volume * price
        self.cash += total_revenue
        
        pos.volume -= volume
        pos.available_volume -= volume
        
        if pos.volume == 0:
            del self.positions[code]
            
        self.orders.append(Order(code, volume, 'SELL', price, time))
        return True

    def end_of_day(self):
        """Reset T+1 available volume at end of day."""
        for pos in self.positions.values():
            pos.available_volume = pos.volume

class AShareSimulator:
    def __init__(self, initial_cash: Decimal = Decimal('1000000.0')):
        self.accounts: Dict[str, Account] = {
            'Model A': Account(initial_cash),
            'Model B': Account(initial_cash),
            'Model C': Account(initial_cash),
            'Model D': Account(initial_cash),
        }
        self.current_time = datetime.datetime.now()

    def to_dict(self):
        return {
            "accounts": {k: v.to_dict() for k, v in self.accounts.items()},
            "current_time": self.current_time.strftime("%Y-%m-%d %H:%M:%S")
        }

    @classmethod
    def from_dict(cls, data):
        sim = cls()
        sim.accounts = {k: Account.from_dict(v) for k, v in data["accounts"].items()}
        sim.current_time = datetime.datetime.strptime(data["current_time"], "%Y-%m-%d %H:%M:%S")
        return sim
    
    def step_day(self):
        for acc in self.accounts.values():
            acc.end_of_day()
