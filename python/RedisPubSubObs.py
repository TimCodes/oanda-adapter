import redis
import threading
import time
from rx import Observable, Observer
from rx.subjects import Subject


class Listener():
    def __init__(self, r, channel):
        self.redis = r
        self.pubsub = self.redis.pubsub()
        self.pubsub.subscribe(**{channel : self.work})
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

