from RedisPubSubObs import Listener
import redis

class TickStreamListener():
    
    def __init__(self, r, pair):
        self.redis = r
        self.pairChannelId = 'tick-' + pair
        self.listener =  Listener(r, self.pairChannelId)
    
    def run(self):
        return self.listener


def p(x):
    print x['data'], "this is the subsriber " 
if __name__ == "__main__":
    r = redis.Redis()
    client = Listener(r, 'test')
    #client.run()

   # client2 = Listener(r, ['test2'])
    #client.run()
    s = client.run();

    s.subscribe(lambda x : p(x))

    r.publish('test', 'this will reach the listener')
    r.publish('fail', 'this will not')
    