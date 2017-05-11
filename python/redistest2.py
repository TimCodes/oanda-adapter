import redis
import threading
import time
from rx import Observable, Observer
from rx.subjects import Subject


class Listener():
    def __init__(self, r, channels):
       
        self.redis = r
        self.pubsub = self.redis.pubsub()
        self.pubsub.subscribe(**{'test' : self.work})
        self.pubsub.thread = self.pubsub.run_in_thread(sleep_time=0.001)
        self.stream  = Subject()
    
    def work(self, item):
        if item['data'] == "KILL":
            self.stop()
        else:    
            self.stream.on_next(item)
    
    def run(self):
        return self.stream

    def stop(self):
        self.stream.dispose()
        self.pubsub.unsubscribe()
        self.pubsub.thread.stop()    


def p(x):
    print x['data'], "this is the subsriber " 
if __name__ == "__main__":
    r = redis.Redis()
    client = Listener(r, ['test'])
    #client.run()

   # client2 = Listener(r, ['test2'])
    #client.run()
    s = client.run();

    s.subscribe(lambda x : p(x))

    r.publish('test', 'this will reach the listener')
    r.publish('fail', 'this will not')
    